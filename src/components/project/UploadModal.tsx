"use client"

import { useState } from "react"
import { Loader2, Upload, FileText, Type } from "lucide-react"
import Modal from "@/components/ui/Modal"

interface UploadModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ projectId, onClose, onSuccess }: UploadModalProps) {
  const [mode, setMode] = useState<"file" | "text">("file")
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [rawContent, setRawContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (mode === "file" && !file) return
    if (mode === "text" && !rawContent.trim()) return

    setLoading(true)
    setStatus("Uploading…")

    try {
      const formData = new FormData()
      formData.append("project_id", projectId)
      formData.append("title", title.trim())

      if (mode === "file" && file) {
        formData.append("file", file)
      } else {
        formData.append("raw_content", rawContent.trim())
      }

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error ?? "Upload failed")
      }

      const { record_id } = await uploadRes.json()
      console.log("[upload] record created:", record_id)

      setStatus("Processing…")

      // Fire-and-forget — processing can take time
      fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_id }),
      }).catch((err) => console.error("Process error:", err))

      onSuccess()
      onClose()
    } catch (err) {
      console.error("Upload error:", err)
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
      setStatus("")
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Upload Document">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-bg-elevated rounded-lg border border-bg-border">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-colors ${
              mode === "file" ? "bg-bg-base text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> File
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-colors ${
              mode === "text" ? "bg-bg-base text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Text
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block mb-2 font-display">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Invoice March 2024"
            className="w-full bg-bg-elevated border border-bg-border rounded-md px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
          />
        </div>

        {/* File or text input */}
        {mode === "file" ? (
          <div>
            <label className="block mb-2 font-display">File</label>
            <label className="flex flex-col items-center justify-center gap-3 w-full h-32 border-2 border-dashed border-bg-border rounded-xl cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-colors">
              <FileText className="w-6 h-6 text-text-muted" />
              <span className="text-xs text-text-muted">
                {file ? file.name : "Click to select PDF, image, or CSV"}
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        ) : (
          <div>
            <label className="block mb-2 font-display">Content</label>
            <textarea
              required
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Paste or type your document content here…"
              rows={6}
              className="w-full bg-bg-elevated border border-bg-border rounded-md px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-accent hover:bg-accent-dim text-bg-base px-6 py-2 rounded-md font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {status || "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
