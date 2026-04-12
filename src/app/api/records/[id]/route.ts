import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id: recordId } = await params
    const supabase = createAdminClient()

    // 1. Get record to find file_path for storage cleanup
    const { data: record, error: fetchError } = await supabase
      .from("records")
      .select("file_path, project_id")
      .eq("id", recordId)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // 2. Delete file from storage if exists
    if (record.file_path) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([record.file_path])
      
      if (storageError) {
        console.error("[delete-record] Storage removal failed:", storageError.message)
      }
    }

    // 3. Delete record from database (cascades to record_chunks)
    const { error: dbError } = await supabase
      .from("records")
      .delete()
      .eq("id", recordId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
