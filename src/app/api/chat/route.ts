import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateEmbedding } from "@/lib/embedding"
import Groq from "groq-sdk"

type Chunk = {
  record_id: string
  chunk_index: number
  content: string
  similarity: number
}

// ─── Memory ──────────────────────────────────────────────────────────────────

async function fetchMemory(
  supabase: ReturnType<typeof createAdminClient>,
  project_id: string,
  user_id: string
): Promise<{ role: string; content: string }[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("project_id", project_id)
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(10) // fetch 10 to get last 5 pairs

  if (!data?.length) return []

  // reverse to chronological order, keep last 5 messages max
  return data.reverse().slice(-5)
}

function buildMemoryBlock(messages: { role: string; content: string }[]): string {
  if (!messages.length) return ""
  const lines = messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
  return `Conversation:\n${lines.join("\n")}\n\n`
}

// ─── Retrieval ───────────────────────────────────────────────────────────────

async function retrieveChunks(
  supabase: ReturnType<typeof createAdminClient>,
  project_id: string,
  question: string
): Promise<Chunk[]> {
  let embedding: number[]
  try {
    embedding = await generateEmbedding(question)
  } catch (e) {
    console.error("[chat] Embedding generation failed:", e)
    return []
  }

  // Try the RPC function first (vector similarity search)
  const { data: chunks, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: 15,
    p_project_id: project_id,
  })

  if (error) {
    console.error("[chat] match_chunks RPC failed:", error.message)
    
    // Fallback: fetch chunks directly (no vector search, just text match)
    const { data: fallbackChunks } = await supabase
      .from("record_chunks")
      .select("record_id, chunk_index, content")
      .eq("project_id", project_id)
      .limit(10)
    
    if (fallbackChunks?.length) {
      return fallbackChunks.map(c => ({ ...c, similarity: 0.7 }))
    }
    return []
  }

  if (!chunks?.length) return []

  return (chunks as Chunk[])
    .sort((a, b) => b.similarity - a.similarity)
    .filter((c) => c.similarity >= 0.1)
    .slice(0, 5)
}

// ─── Context ─────────────────────────────────────────────────────────────────
// Context building is now integrated into buildPrompt so it can access document titles.

// ─── Prompt ──────────────────────────────────────────────────────────────────

async function buildPrompt(supabase: ReturnType<typeof createAdminClient>, project_id: string, chunks: Chunk[], memory: string, question: string, hasContext: boolean): Promise<string> {
  // Fetch basic metadata about what files are in this project
  const { data: recordsData } = await supabase
    .from("records")
    .select("id, title, record_type, status")
    .eq("project_id", project_id);
    
  const recordsMap = new Map(recordsData?.map(r => [r.id, r.title]) || []);
  const projectDocsContext = recordsData?.length
    ? `\nOverview of uploaded documents in this project:\n` + recordsData.map(r => `- ${r.title} (${r.record_type}, Status: ${r.status})`).join("\n")
    : "\nNo documents are currently uploaded to this project.";

  // Generate context string with titles
  let context = ""
  if (hasContext) {
    for (let i = 0; i < chunks.length; i++) {
      const { record_id, chunk_index, content } = chunks[i]
      const title = recordsMap.get(record_id) || "Unknown Document"
      const entry = `Document Title: ${title}\nText Passage:\n${content}\n\n`
      if ((context + entry).length > 12000) break
      context += entry
    }
    context = context.trim()
  }

  if (!hasContext) {
    return `You are a helpful user-facing document assistant for a project called RecordsVault.

Background context to inform you:
${projectDocsContext}

Be helpful, friendly, and natural. Do NOT use technical jargon (like "document ID", "chunks", or database statuses like "error/ready").
If the user asks what is uploaded, naturally list the titles. If they ask about something not in their documents, politely let them know based on their project overview.

${memory}
Question: ${question}`
  }

  return `You are an intelligent, conversational document assistant for RecordsVault.
Your goal is to answer the user's question naturally and clearly, using the context from their uploaded documents.

CRITICAL RULES:
1. NEVER mention technical database details (like "Document ID", "Chunk ID", "Status", or system variables).
2. DO NOT quote raw, unformatted, or badly OCR'd text (with lots of spaces/symbols). Instead, read the raw text and seamlessly paraphrase or reformat it into clean, readable sentences.
3. Keep your answers concise, human-friendly, and professional. Synthesize the info—don't just spit out a bulleted list of raw data.
4. Don't say "I extracted the following content". Just provide the answer.

----------------------------------------
Project Overview:
${projectDocsContext}

----------------------------------------
Document Extracts:
${context}

----------------------------------------
${memory}
----------------------------------------
User Question:
${question}`
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth check using user-scoped client
    const userSupabase = await createClient()
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use admin client for DB operations
    const supabase = createAdminClient()

    const body = await req.json()
    const { project_id, question } = body as { project_id?: string; question?: string }

    if (!project_id || !question?.trim()) {
      return NextResponse.json({ error: "project_id and question are required" }, { status: 400 })
    }

    // 1. Retrieve relevant chunks
    const chunks = await retrieveChunks(supabase, project_id, question)
    const hasContext = chunks.length > 0

    // 2. Build context + prompt
    const memory = buildMemoryBlock(await fetchMemory(supabase, project_id, user.id))
    const prompt = await buildPrompt(supabase, project_id, chunks, memory, question, hasContext)

    // 3. Call Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    })

    const answer = completion.choices[0]?.message?.content?.trim() ?? "I'm sorry, I couldn't generate a response. Please try again."

    // 4. Save chat messages
    await saveMessages(supabase, project_id, user.id, question, answer)

    const sources = chunks.map(({ record_id, chunk_index }) => ({ 
      record_id, 
      chunk_index, 
      title: recordsMap.get(record_id) || "Unknown Document" 
    }))

    return NextResponse.json({ answer, sources })
  } catch (err) {
    console.error("[chat] Error:", err)
    return NextResponse.json({ 
      answer: "I encountered an error while processing your question. Please try again.", 
      sources: [] 
    }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function saveMessages(
  supabase: ReturnType<typeof createAdminClient>,
  project_id: string,
  user_id: string,
  question: string,
  answer: string
) {
  const { error } = await supabase.from("chat_messages").insert([
    { project_id, user_id, role: "user", content: question },
    { project_id, user_id, role: "assistant", content: answer },
  ])
  if (error) {
    console.error("[chat] Failed to save messages:", error.message)
  }
}
