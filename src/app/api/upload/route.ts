import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    // Auth check using user-scoped client
    const userSupabase = await createClient()
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client for storage + DB writes (bypasses RLS)
    const supabase = createAdminClient()

    const formData = await req.formData()
    const project_id = formData.get("project_id") as string | null
    const title = formData.get("title") as string | null
    const file = formData.get("file") as File | null
    const raw_text = formData.get("raw_content") as string | null

    if (!project_id || !title) {
      return NextResponse.json({ error: "project_id and title are required" }, { status: 400 })
    }

    if (!file && !raw_text) {
      return NextResponse.json({ error: "Either a file or raw_content must be provided" }, { status: 400 })
    }

    let file_path: string | null = null
    let input_type: "pdf" | "image" | "csv" | "text" = "text"

    if (file) {
      // Determine input_type from MIME
      const mime = file.type
      if (mime === "application/pdf") input_type = "pdf"
      else if (mime.startsWith("image/")) input_type = "image"
      else if (mime === "text/csv" || mime === "application/vnd.ms-excel") input_type = "csv"
      else input_type = "text"

      const ext = file.name.split(".").pop() ?? "bin"
      file_path = `${project_id}/${randomUUID()}.${ext}`

      const fileBuffer = await file.arrayBuffer()

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(file_path, fileBuffer, { contentType: mime, upsert: false })

      if (storageError) {
        return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 })
      }
    }

    const { data: record, error: dbError } = await supabase
      .from("records")
      .insert({
        project_id,
        title,
        raw_content: raw_text ?? null,
        input_type,
        status: "processing",
        file_path,
        uploaded_by: user.id,
      })
      .select("id")
      .single()

    if (dbError) {
      return NextResponse.json({ error: `DB insert failed: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ record_id: record.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
