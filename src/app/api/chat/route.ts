import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/embedding"
import Groq from "groq-sdk"

const FALLBACK = "I could not find relevant information in your documents."
const FALLBACK_NOT_IN_CONTEXT = "I could not find this information in the uploaded documents."

type Chunk = {
  record_id: string
  chunk_index: number
  content: string
  similarity: number
}

// ─── Memory ──────────────────────────────────────────────────────────────────

async function fetchMemory(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  project_id: string,
  question: string
): Promise<Chunk[]> {
  const embedding = await generateEmbedding(question)

  const { data: chunks, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: 15,
    project_id,
  })

  if (error || !chunks?.length) return []

  return (chunks as Chunk[])
    .sort((a, b) => b.similarity - a.similarity)
    .filter((c) => c.similarity >= 0.5)
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

function buildPrompt(context: string, memory: string, question: string): string {
  return `You are a document assistant.
You MUST prioritize the provided context over conversation history.
Use conversation history only for understanding the question, NOT for factual answers.
Answer ONLY using the context.
If the answer is not in the context, say: "${FALLBACK_NOT_IN_CONTEXT}"

----------------------------------------
Context:
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
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { project_id, question } = body as { project_id?: string; question?: string }

    if (!project_id || !question?.trim()) {
      return NextResponse.json({ error: "project_id and question are required" }, { status: 400 })
    }

    // 1. Retrieve relevant chunks
    const chunks = await retrieveChunks(supabase, project_id, question)

    if (!chunks.length) {
      await saveMessages(supabase, project_id, user.id, question, FALLBACK)
      return NextResponse.json({ answer: FALLBACK, sources: [] })
    }

    // 2. Build context + prompt
    const context = buildContext(chunks)
    const memory = buildMemoryBlock(await fetchMemory(supabase, project_id, user.id))
    const prompt = buildPrompt(context, memory, question)

    // 3. Call Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    })

    const answer = completion.choices[0]?.message?.content?.trim() ?? FALLBACK

    // 4. Save chat messages (answer text only)
    await saveMessages(supabase, project_id, user.id, question, answer)

    const sources = chunks.map(({ record_id, chunk_index }) => ({ record_id, chunk_index }))

    return NextResponse.json({ answer, sources })
  } catch (err) {
    console.error("[chat] Error:", err)
    return NextResponse.json({ answer: FALLBACK, sources: [] }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function saveMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  project_id: string,
  user_id: string,
  question: string,
  answer: string
) {
  await supabase.from("chat_messages").insert([
    { project_id, user_id, role: "user", content: question },
    { project_id, user_id, role: "assistant", content: answer },
  ])
}
