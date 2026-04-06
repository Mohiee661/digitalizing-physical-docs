import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project_id = req.nextUrl.searchParams.get("project_id")
    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 })
    }

    const { data: records, error } = await supabase
      .from("records")
      .select("id, title, input_type, record_type, status, confidence, summary, raw_content, created_at")
      .eq("project_id", project_id)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(records ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
