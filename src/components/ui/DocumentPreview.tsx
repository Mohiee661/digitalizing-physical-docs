"use client"

import { useState } from "react"
import { FileText, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react"

export default function DocumentPreview({
  signedUrl,
  inputType,
}: {
  signedUrl: string
  inputType: string
}) {
  const [open, setOpen] = useState(false)

  const isPdf = inputType === "pdf"
  const isImage = inputType === "image"

  if (!isPdf && !isImage) return null

  return (
    <div className="border border-bg-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-bg-surface hover:bg-bg-elevated transition-colors text-sm font-medium text-text-secondary"
      >
        <span className="flex items-center gap-2">
          {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          {open ? "Hide Document" : "View Document"}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="bg-bg-base p-4">
          {isPdf && (
            <iframe
              src={signedUrl}
              className="w-full h-[600px] rounded border border-bg-border"
              title="Document Preview"
            />
          )}
          {isImage && (
            <img
              src={signedUrl}
              alt="Document Preview"
              className="max-w-full max-h-[600px] mx-auto rounded border border-bg-border object-contain"
            />
          )}
        </div>
      )}
    </div>
  )
}
