import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Groq from "groq-sdk"
import { generateEmbedding } from "@/lib/embedding"
import { PDFParse } from "pdf-parse"
import Tesseract from "tesseract.js"

// ─── Helpers ────────────────────────────────────────────────────────────────

async function extractText(
  input_type: string,
  raw_content: string | null,
  file_path: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>
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
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }

  if (input_type === "image") {
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

// Cached extractor and embedding are handled in @/lib/embedding

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()

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

    // 5. Summarize via Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

    await supabase.from("records").update({ summary }).eq("id", record_id)

    // 6. Clean + chunk + embed in parallel + store
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

    const { error: chunkError } = await supabase.from("record_chunks").insert(chunkRows)
    if (chunkError) throw new Error(`Chunk insert failed: ${chunkError.message}`)

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
      const supabaseErr = await createClient()
      await supabaseErr.from("records").update({ status: "error" }).eq("id", record_id)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
