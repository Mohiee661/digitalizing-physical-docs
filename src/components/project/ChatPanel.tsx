"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, MessageSquare, Trash } from "lucide-react"

type Source = { record_id: string; chunk_index: number; title?: string }

type Message = {
  role: "user" | "assistant"
  content: string
  sources?: Source[]
}

export default function ChatPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch old messages on mount
  useEffect(() => {
    fetch(`/api/chat?project_id=${projectId}`)
      .then(res => res.json())
      .then(data => setMessages(data.messages || []))
      .catch(console.error)
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const clearChat = async () => {
    if (!confirm("Are you sure you want to clear the chat history?")) return
    setMessages([])
    await fetch(`/api/chat?project_id=${projectId}`, { method: "DELETE" })
  }

  // Parses basic [Text](url) markdown to actual clickable links
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue hover:text-accent underline font-medium">
            {match[1]}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  const send = async () => {
    const question = input.trim()
    if (!question || loading) return

    setMessages((prev) => [...prev, { role: "user", content: question }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, question }),
      })
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources ?? [] },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[480px] border border-bg-border rounded-xl bg-bg-surface overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="p-4 bg-bg-elevated rounded-2xl border border-bg-border">
              <MessageSquare className="w-8 h-8 text-text-muted" />
            </div>
            <div>
              <p className="text-text-secondary font-medium mb-1">No chat messages yet</p>
              <p className="text-text-muted text-xs leading-relaxed">
                Ask anything about your documents in <span className="text-accent">{projectName}</span>
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0 self-start mt-0.5">
                <span className="text-[9px] font-bold text-accent">AI</span>
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[75%] flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-accent text-bg-base rounded-br-none"
                  : "bg-bg-base border border-bg-border text-text-primary rounded-tl-none"
              }`}>
                {renderMessageContent(msg.content)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-accent">AI</span>
            </div>
            <div className="bg-bg-base border border-bg-border rounded-2xl rounded-tl-none px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 md:p-5 border-t border-bg-border bg-bg-surface">
          <div className="flex gap-2">
            <button
              onClick={clearChat}
              disabled={loading || messages.length === 0}
              className="p-2.5 bg-bg-elevated border border-bg-border text-text-muted rounded-lg hover:text-red hover:border-red/30 transition-colors shrink-0 disabled:opacity-40"
              title="Clear chat"
            >
              <Trash className="w-4 h-4" />
            </button>
            <textarea
              value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask about your project..."
            disabled={loading}
            rows={1}
            className="flex-1 bg-bg-elevated border border-bg-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted disabled:opacity-50 resize-none min-h-[44px] max-h-[120px]"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-accent text-bg-base rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-2.5 text-center uppercase tracking-widest">
          AI answers based on your project records only
        </p>
      </div>
    </div>
  )
}
