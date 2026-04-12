import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import Groq from "groq-sdk"
import { generateEmbedding } from "@/lib/embedding"

// ─── Helpers ────────────────────────────────────────────────────────────────

async function extractText(
  input_type: string,
  raw_content: string | null,
  file_path: string | null,
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  if (input_type === "text") {
    if (!raw_content) throw new Error("raw_content is empty for text record")
    return raw_content
  }

  if (!file_path) throw new Error("file_path is required for non-text records")

  const { data: fileData, error } = await supabase.storage
    .from("documents")
    .download(file_path)

  if (error || !fileData) throw new Error(`Storage download failed: ${error?.message}`)

  if (input_type === "pdf") {
    const { PDFParse } = await import("pdf-parse")
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }

  if (input_type === "image") {
    const Tesseract = (await import("tesseract.js")).default
    const buffer = Buffer.from(await fileData.arrayBuffer())
    if (buffer.byteLength > 5 * 1024 * 1024) {
      throw new Error("Image too large for OCR")
    }
    const { data } = await Tesseract.recognize(buffer, "eng")
    return data.text
  }

  throw new Error(`Unsupported input_type: ${input_type}`)
}

function chunkText(text: string, size = 800): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check using the user-scoped client
  const userSupabase = await createClient()
  const { data: { user }, error: authError } = await userSupabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use admin client for all DB operations (bypasses RLS)
  const supabase = createAdminClient()

  let record_id: string | undefined

  try {
    const body = await req.json()
    record_id = body.record_id

    if (!record_id) {
      return NextResponse.json({ error: "record_id is required" }, { status: 400 })
    }

    // 1. Fetch record
    const { data: record, error: fetchError } = await supabase
      .from("records")
      .select("id, input_type, file_path, raw_content, project_id")
      .eq("id", record_id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // 2. CSV — skip AI, mark ready
    if (record.input_type === "csv") {
      await supabase.from("records").update({ status: "ready" }).eq("id", record_id)
      return NextResponse.json({ message: "CSV record marked ready, no AI processing." })
    }

    // 3. Extract text
    const extractedText = await extractText(
      record.input_type,
      record.raw_content,
      record.file_path,
      supabase
    )

    // Save extracted text + mark status extracted
    await supabase
      .from("records")
      .update({ raw_content: extractedText, status: "extracted" })
      .eq("id", record_id)

    // 4. Image — needs human review, stop here
    if (record.input_type === "image") {
      await supabase.from("records").update({ status: "needs_review" }).eq("id", record_id)
      return NextResponse.json({ message: "Image OCR complete. Marked needs_review." })
    }

    // 5. Summarize and Classify via Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // A. Generate Summary
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `Summarize the following document clearly and concisely in 5 bullet points.\nFocus on key facts, entities, and important details.\n\nDocument:\n${extractedText}`,
        },
      ],
    })
    const summary = completion.choices[0]?.message?.content ?? ""

    // B. Classify Document
    let record_type = "public"
    let confidence = 0
    try {
      const classCompletion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a strict document classifier. Output valid JSON with strictly two keys: 'record_type' (exactly one of: legal, medical, financial, personal, public, identity) and 'confidence' (an integer from 0 to 100). No markdown formatting or extra text."
          },
          {
            role: "user",
            content: `Classify this document based on the following text content:\n\n${extractedText.substring(0, 4000)}` 
          }
        ],
        response_format: { type: "json_object" }
      })
      
      const parsed = JSON.parse(classCompletion.choices[0]?.message?.content ?? "{}")
      if (parsed.record_type) record_type = parsed.record_type.toLowerCase()
      // Store confidence as 0-1 float to match what the UI expects
      if (typeof parsed.confidence === "number") confidence = parsed.confidence / 100
    } catch (e) {
      console.error("[process] Classification failed, using defaults", e)
    }

    // Update record with summary and classification
    await supabase.from("records").update({ summary, record_type, confidence }).eq("id", record_id)

    // 6. Clean + chunk + embed + store
    const cleanedText = extractedText.replace(/\s+/g, " ").trim()
    const chunks = chunkText(cleanedText).slice(0, 50)

    const embeddings = await Promise.all(chunks.map((chunk) => generateEmbedding(chunk)))

    const chunkRows = chunks.map((chunk, index) => ({
      record_id,
      project_id: record.project_id,
      content: chunk,
      embedding: embeddings[index],
      chunk_index: index,
    }))

    // Delete old chunks before inserting new (for reprocess)
    await supabase.from("record_chunks").delete().eq("record_id", record_id)

    const { error: chunkError } = await supabase.from("record_chunks").insert(chunkRows)
    if (chunkError) {
      console.error("[process] Chunk insert failed:", chunkError.message)
      // Don't crash — record still has summary + classification
    }

    // 7. Final update
    await supabase
      .from("records")
      .update({ content: cleanedText, status: "ready" })
      .eq("id", record_id)

    return NextResponse.json({ message: "Processing complete", record_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    console.error("[process] Error:", message, err)

    if (record_id) {
      try {
        await supabase.from("records").update({ status: "error" }).eq("id", record_id)
      } catch { /* best effort */ }
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
