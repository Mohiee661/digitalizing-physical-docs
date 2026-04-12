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

async function buildPrompt(project_id: string, chunks: Chunk[], memory: string, question: string, hasContext: boolean, recordsData: any[], recordsMap: Map<string, string>): Promise<string> {
  const projectDocsContext = recordsData?.length
    ? `\nOverview of uploaded documents in this project:\n` + recordsData.map(r => `- ${r.title} (${r.record_type}, Status: ${r.status})`).join("\n")
    : "\nNo documents are currently uploaded to this project.";

  // Generate context string with titles
  let context = ""
  if (hasContext) {
    for (let i = 0; i < chunks.length; i++) {
      const { record_id, chunk_index, content } = chunks[i]
      const title = recordsMap.get(record_id) || "Unknown Document"
      const docLink = `/projects/${project_id}/records/${record_id}?chunk=${chunk_index}`
      const downloadLink = `/api/download/${record_id}`
      const entry = `Document Title: ${title}\nView Link: ${docLink}\nDownload Link: ${downloadLink}\nText Passage:\n${content}\n\n`
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
2. DO NOT quote raw, unformatted, or badly OCR'd text. Clean it up into natural sentences.
3. Keep your answers concise, human-friendly, and professional. 
4. DO NOT say "I cannot provide the document" or "I am unable to provide it". You DO have the files!
5. When a user asks to see, get, view, or download the document, you MUST reply with the markdown link using the Download Link provided in the text extracts. Example: "Here is your document: [Download ML Certificate 2](/api/download/...)"
6. Always embed these links inline naturally within your response. DO NOT create "Sources" or "[1]" footnotes at the bottom.

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

    const { data: recordsData } = await supabase
      .from("records")
      .select("id, title, record_type, status")
      .eq("project_id", project_id);
    
    const recordsMap = new Map(recordsData?.map(r => [r.id, r.title]) || []);

    const history = await fetchMemory(supabase, project_id, user.id)
    
    // 1. Condense Question (Groq)
    // If there is history, rephrase the question to be standalone for RAG
    let standaloneQuestion = question
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    if (history.length > 0) {
      try {
        const condenseResponse = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `You are an assistant that reformulates user questions to be standalone retrieval queries. 
Given the conversation history and the latest user question, rephrase the question so it can be used for document retrieval without needing the history. 
If the question is already standalone, return it as is. 
Only return the rephrased question text.`
            },
            {
              role: "user",
              content: `History:\n${history.map(m => `${m.role}: ${m.content}`).join("\n")}\n\nQuestion: ${question}`
            }
          ]
        })
        standaloneQuestion = condenseResponse.choices[0]?.message?.content?.trim() || question
      } catch (e) {
        console.error("[chat] Condense failed:", e)
      }
    }

    // 2. Retrieve relevant chunks (using standalone question)
    let chunks = await retrieveChunks(supabase, project_id, standaloneQuestion)

    // 2.1 Keyword Boost: Check if the question refers to specific documents or types
    const lowerQ = standaloneQuestion.toLowerCase()
    const matchingRecordIds = recordsData?.filter(r => {
      const title = (r.title || "").toLowerCase()
      const type = (r.record_type || "").toLowerCase()
      return lowerQ.includes(title) || lowerQ.includes(type) || (title.includes("med") && lowerQ.includes("medical"))
    }).map(r => r.id) || []

    if (matchingRecordIds.length > 0) {
      const { data: extraChunks } = await supabase
        .from("record_chunks")
        .select("record_id, chunk_index, content")
        .in("record_id", matchingRecordIds)
        .limit(5)
      
      if (extraChunks) {
        // Merge without duplicates
        const existingIds = new Set(chunks.map(c => `${c.record_id}-${c.chunk_index}`))
        extraChunks.forEach(ec => {
          if (!existingIds.has(`${ec.record_id}-${ec.chunk_index}`)) {
            chunks.push({ ...ec, similarity: 0.9 })
          }
        })
      }
    }

    const hasContext = chunks.length > 0
    const memory = buildMemoryBlock(history)
    const prompt = await buildPrompt(project_id, chunks, memory, question, hasContext, recordsData || [], recordsMap)

    // 3. Call Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    })

    const answer = completion.choices[0]?.message?.content?.trim() ?? "I'm sorry, I couldn't generate a response. Please try again."

    // 4. Save chat messages
    await saveMessages(supabase, project_id, user.id, question, answer)

    return NextResponse.json({ answer, sources: [] })
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

export async function GET(req: NextRequest) {
  try {
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const project_id = searchParams.get("project_id")
    if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 })

    const supabase = createAdminClient()
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("project_id", project_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const project_id = searchParams.get("project_id")
    if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 })

    const supabase = createAdminClient()
    await supabase.from("chat_messages").delete().eq("project_id", project_id).eq("user_id", user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 })
  }
}
