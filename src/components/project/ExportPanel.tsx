"use client"

import { useState } from "react"
import { FileCode, Grid, Download, Loader2 } from "lucide-react"

type Record = {
  id: string
  title: string | null
  input_type: string
  record_type: string | null
  status: string | null
  confidence: number | null
  summary: string | null
  raw_content: string | null
  created_at: string
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCSV(records: Record[]): string {
  const headers = ["id", "title", "input_type", "record_type", "status", "confidence", "created_at"]
  const rows = records.map((r) =>
    headers.map((h) => {
      const val = r[h as keyof Record] ?? ""
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function toJSON(records: Record[]): string {
  return JSON.stringify(
    records.map(({ id, title, input_type, record_type, status, confidence, summary, raw_content, created_at }) => ({
      id, title, input_type, record_type, status, confidence, summary, raw_content, created_at,
    })),
    null,
    2
  )
}

export default function ExportPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [loading, setLoading] = useState<"json" | "csv" | null>(null)

  const fetchRecords = async (): Promise<Record[]> => {
    const res = await fetch(`/api/export?project_id=${projectId}`)
    if (!res.ok) throw new Error("Failed to fetch records")
    return res.json()
  }

  const handleExport = async (type: "json" | "csv") => {
    setLoading(type)
    try {
      const records = await fetchRecords()
      const slug = projectName.toLowerCase().replace(/\s+/g, "-")
      if (type === "json") {
        downloadFile(toJSON(records), `${slug}-export.json`, "application/json")
      } else {
        downloadFile(toCSV(records), `${slug}-export.csv`, "text/csv")
      }
    } catch (err) {
      console.error(err)
      alert("Export failed. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const options = [
    {
      type: "csv" as const,
      title: "Spreadsheet",
      desc: "Basic fields — id, title, type, status, confidence, date",
      icon: <Grid className="w-6 h-6" />,
      label: "Export CSV",
    },
    {
      type: "json" as const,
      title: "JSON Dump",
      desc: "Full export including summaries and extracted content",
      icon: <FileCode className="w-6 h-6" />,
      label: "Export JSON",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
      {options.map((opt) => (
        <div
          key={opt.type}
          className="bg-bg-surface border border-bg-border rounded-xl p-8 flex flex-col items-center text-center group hover:border-accent/20 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-bg-border flex items-center justify-center mb-6 text-text-secondary group-hover:text-accent group-hover:bg-accent/5 transition-colors">
            {opt.icon}
          </div>
          <h3 className="font-display font-bold text-lg mb-2">{opt.title}</h3>
          <p className="text-text-secondary text-sm mb-8 leading-relaxed">{opt.desc}</p>
          <button
            onClick={() => handleExport(opt.type)}
            disabled={loading !== null}
            className="w-full py-2.5 rounded-md border border-bg-border font-bold text-xs uppercase tracking-widest hover:bg-bg-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading === opt.type
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Exporting…</>
              : <><Download className="w-3 h-3" /> {opt.label}</>
            }
          </button>
        </div>
      ))}
    </div>
  )
}
