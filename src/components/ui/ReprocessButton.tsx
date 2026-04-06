"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"

export default function ReprocessButton({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleReprocess = async () => {
    setLoading(true)
    setDone(false)
    try {
      await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_id: recordId }),
      })
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReprocess}
      disabled={loading}
      className="flex items-center gap-2 bg-bg-surface border border-bg-border px-4 py-2 rounded-md text-xs font-bold hover:bg-bg-elevated transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Processing…" : done ? "Done" : "Reprocess"}
    </button>
  )
}
