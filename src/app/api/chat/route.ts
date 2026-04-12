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
    .filter((c) => c.similarity >= 0.3)
    .slice(0, 8)
}

// ─── Context ─────────────────────────────────────────────────────────────────

function buildContext(chunks: Chunk[]): string {
  let context = ""
  for (let i = 0; i < chunks.length; i++) {
    const { record_id, chunk_index, content } = chunks[i]
    const entry = `[Source ${i + 1}]\nDocument ID: ${record_id}\nChunk: ${chunk_index}\nContent:\n${content}\n\n`
    if ((context + entry).length > 12000) break
    context += entry
  }
  return context.trim()
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(context: string, memory: string, question: string, hasContext: boolean): string {
  if (!hasContext) {
    return `You are a helpful document assistant for a project called RecordsVault.
The user has uploaded documents to this project, but either the documents haven't been processed yet, or no relevant content was found for this particular question.

Be helpful and friendly. If the question seems to be about their documents, let them know that:
- Their documents may still be processing (they can check the Files tab)
- They can try rephrasing their question
- They can upload more documents if needed

If the question is a general question, answer it helpfully.

${memory}
Question: ${question}`
  }

  return `You are a helpful document assistant for RecordsVault.
Answer the user's question using the provided context from their uploaded documents.
Be thorough, helpful, and cite specific information from the documents when possible.
If the specific answer isn't in the context but you can make a reasonable inference, do so and note it.
If the answer truly cannot be found in the context, say so clearly and suggest what the user could try.

----------------------------------------
Context from uploaded documents:
${context}

----------------------------------------
${memory}
----------------------------------------
Question:
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
    const context = buildContext(chunks)
    const memory = buildMemoryBlock(await fetchMemory(supabase, project_id, user.id))
    const prompt = buildPrompt(context, memory, question, hasContext)

    // 3. Call Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    })

    const answer = completion.choices[0]?.message?.content?.trim() ?? "I'm sorry, I couldn't generate a response. Please try again."

    // 4. Save chat messages
    await saveMessages(supabase, project_id, user.id, question, answer)

    const sources = chunks.map(({ record_id, chunk_index }) => ({ record_id, chunk_index }))

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
