"use client"

import { useEffect, useRef } from "react"

type Chunk = {
  chunk_index: number
  content: string
}

export default function ChunkedContent({
  chunks,
  highlightChunk,
}: {
  chunks: Chunk[]
  highlightChunk: number | null
}) {
  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightChunk === null) return
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
    return () => clearTimeout(timer)
  }, [highlightChunk])

  if (!chunks.length) {
    return (
      <pre className="font-mono text-sm leading-relaxed text-text-secondary whitespace-pre-wrap p-8 bg-bg-surface border border-bg-border rounded-xl">
        No extracted text found.
      </pre>
    )
  }

  return (
    <div className="space-y-3">
      {chunks.map((chunk) => {
        const isHighlighted = chunk.chunk_index === highlightChunk
        return (
          <div
            key={chunk.chunk_index}
            id={`chunk-${chunk.chunk_index}`}
            ref={isHighlighted ? highlightRef : null}
            className={`relative font-mono text-sm leading-relaxed whitespace-pre-wrap p-5 rounded-xl border transition-all duration-700 ${
              isHighlighted
                ? "border-accent/40 bg-accent/5 text-text-primary shadow-[0_0_0_2px_rgba(232,255,71,0.15)]"
                : "border-bg-border bg-bg-surface text-text-secondary"
            }`}
          >
            <span className="absolute top-2 right-3 text-[10px] font-mono text-text-muted">
              #{chunk.chunk_index}
            </span>
            {chunk.content}
          </div>
        )
      })}
    </div>
  )
}
