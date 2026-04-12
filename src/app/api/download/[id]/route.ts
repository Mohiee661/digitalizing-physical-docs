import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordId = params.id
    if (!recordId) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Fetch file_path from record
    const { data: record, error: dbError } = await supabase
      .from("records")
      .select("file_path, input_type, raw_content, title")
      .eq("id", recordId)
      .single()

    if (dbError || !record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // 2. Text documents might not have a file
    if (record.input_type === "text" && !record.file_path) {
      // Return a text response natively
      return new NextResponse(record.raw_content || "", {
        headers: {
          "Content-Disposition": `attachment; filename="${record.title || 'document'}.txt"`,
          "Content-Type": "text/plain",
        },
      })
    }

    // 3. For actual files in storage
    if (!record.file_path) {
      return NextResponse.json({ error: "No file associated with this record." }, { status: 404 })
    }

    // Create a short-lived signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(record.file_path, 60, { download: true }) // 60 seconds

    if (urlError || !urlData) {
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 })
    }

    // Redirect user to the Supabase download URL securely
    return NextResponse.redirect(urlData.signedUrl)
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
