"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  Search, Plus, Filter, Type, Download,
  MoreVertical, FileText, Image as ImageIcon,
  FileCode, FolderOpen
} from "lucide-react"
import Badge from "@/components/ui/Badge"
import UploadModal from "@/components/project/UploadModal"
import { useRouter } from "next/navigation"

type Record = {
  id: string
  title: string | null
  input_type: string
  record_type: string | null
  confidence: number | null
  created_at: string
}

interface FilesTabProps {
  projectId: string
  initialRecords: Record[]
  searchQuery: string
}

export default function FilesTab({ projectId, initialRecords, searchQuery }: FilesTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [minConfidence, setMinConfidence] = useState<number>(0)
  const router = useRouter()

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-green"
    if (score >= 0.5) return "bg-orange"
    return "bg-red"
  }

  const handleUploadSuccess = useCallback(() => {
    router.refresh()
  }, [router])


  const filteredRecords = initialRecords.filter((rec) => {
    const typeMatch = filterType === "all" || rec.record_type === filterType
    const confMatch = (rec.confidence || 0) >= minConfidence
    
    // Search is handled by server via defaultValue/query params, 
    // but just for client-side sorting we pass both
    return typeMatch && confMatch
  })

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
            <input
              name="q"
              type="text"
              placeholder="Search records..."
              defaultValue={searchQuery}
              className="w-full bg-bg-surface border border-bg-border rounded-md pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </form>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              title="Filter by Confidence"
              value={minConfidence.toString()}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="flex-1 md:flex-none flex items-center justify-center bg-bg-surface border border-bg-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-bg-elevated focus:outline-none transition-colors"
            >
              <option value="0">All Confidences</option>
              <option value="0.5">Medium+ (&ge;50%)</option>
              <option value="0.8">High+ (&ge;80%)</option>
            </select>
            <select
              title="Filter by Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 md:flex-none flex items-center justify-center bg-bg-surface border border-bg-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-bg-elevated focus:outline-none transition-colors"
            >
              <option value="all">All Types</option>
              <option value="identity">Identity</option>
              <option value="legal">Legal</option>
              <option value="medical">Medical</option>
              <option value="financial">Financial</option>
              <option value="personal">Personal</option>
              <option value="public">Public</option>
              <option value="unclassified">Unclassified</option>
            </select>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-accent hover:bg-accent-dim text-bg-base px-4 py-2.5 rounded-md text-sm font-bold transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-elevated/50 border-b border-bg-border">
                <tr>
                  <th className="px-6 py-4 font-display font-bold uppercase tracking-wider text-[11px] text-text-secondary">Document</th>
                  <th className="px-6 py-4 font-display font-bold uppercase tracking-wider text-[11px] text-text-secondary">Type</th>
                  <th className="px-6 py-4 font-display font-bold uppercase tracking-wider text-[11px] text-text-secondary">Confidence</th>
                  <th className="px-6 py-4 font-display font-bold uppercase tracking-wider text-[11px] text-text-secondary">Date</th>
                  <th className="px-6 py-4 font-display font-bold uppercase tracking-wider text-[11px] text-text-secondary"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-bg-elevated/40 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${projectId}/records/${record.id}`} className="flex items-center gap-3">
                        <div className="p-2 bg-bg-elevated rounded-lg border border-bg-border group-hover:border-accent/20 transition-colors">
                          {record.input_type === "pdf" && <FileText className="w-4 h-4 text-blue" />}
                          {record.input_type === "image" && <ImageIcon className="w-4 h-4 text-green" />}
                          {(record.input_type === "text" || record.input_type === "csv") && <FileCode className="w-4 h-4 text-orange" />}
                        </div>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                            {record.title || "Untitled Record"}
                          </p>
                          <p className="text-xs text-text-muted uppercase tracking-tighter">{record.input_type}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={(record.record_type as any) || "unclassified"}>{record.record_type || "unclassified"}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24">
                        <span className="text-[10px] font-mono text-text-secondary block mb-1">
                          {((record.confidence || 0) * 100).toFixed(0)}%
                        </span>
                        <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getConfidenceColor(record.confidence || 0)} transition-all duration-500`}
                            style={{ width: `${(record.confidence || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-mono text-xs">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(`/api/download/${record.id}`, '_blank')
                          }}
                          className="p-2 hover:bg-bg-elevated rounded transition-colors text-text-secondary"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Link 
                          href={`/projects/${projectId}/records/${record.id}`}
                          className="p-2 hover:bg-bg-elevated rounded transition-colors text-text-secondary"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="p-4 bg-bg-elevated rounded-xl border border-bg-border">
                          <FolderOpen className="w-8 h-8 text-text-muted" />
                        </div>
                        <p className="text-text-secondary font-medium">No documents yet</p>
                        <p className="text-text-muted text-xs">Upload a file or paste text to get started</p>
                        <button
                          onClick={() => setUploadOpen(true)}
                          className="mt-1 flex items-center gap-2 bg-accent hover:bg-accent-dim text-bg-base px-4 py-2 rounded-md text-xs font-bold transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Upload your first document
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {uploadOpen && (
        <UploadModal
          projectId={projectId}
          onClose={() => setUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  )
}
