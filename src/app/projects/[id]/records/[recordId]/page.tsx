import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  FileText, 
  Clock, 
  Shield,
  Copy
} from "lucide-react"
import Link from "next/link"
import Badge from "@/components/ui/Badge"
import DocumentPreview from "@/components/ui/DocumentPreview"
import ChunkedContent from "@/components/ui/ChunkedContent"
import ReprocessButton from "@/components/ui/ReprocessButton"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function RecordDetailPage({ params, searchParams }: { 
  params: Promise<{ id: string, recordId: string }>,
  searchParams: Promise<{ chunk?: string }>
}) {
  const { id, recordId } = await params
  const { chunk } = await searchParams
  const highlightChunk = chunk !== undefined ? parseInt(chunk, 10) : null
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: record } = await supabase
    .from('records')
    .select('*')
    .eq('id', recordId)
    .single()

  if (!record) redirect(`/projects/${id}`)

  // Fetch chunks for this record
  const { data: chunks } = await supabase
    .from("record_chunks")
    .select("chunk_index, content")
    .eq("record_id", recordId)
    .order("chunk_index", { ascending: true })

  // Generate signed URL for file preview if applicable
  let signedUrl: string | null = null
  if (record.file_path && (record.input_type === "pdf" || record.input_type === "image")) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(record.file_path, 60 * 60) // 1 hour
    signedUrl = signed?.signedUrl ?? null
  }

  return (
    <main className="min-h-screen flex flex-col bg-bg-base">
      {/* Header */}
      <nav className="h-16 border-b border-bg-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={`/projects/${id}`} className="p-2 hover:bg-bg-elevated rounded-md transition-colors text-text-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-[1px] bg-bg-border" />
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-lg text-text-primary tracking-tight truncate max-w-[300px]">
              {record.title || "Untitled Record"}
            </h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest leading-none">Record Detail</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ReprocessButton recordId={recordId} />
          <button className="flex items-center gap-2 bg-bg-surface border border-bg-border px-4 py-2 rounded-md text-xs font-bold hover:bg-bg-elevated transition-colors">
            <Download className="w-4 h-4" />
            Download
          </button>
          <button className="flex items-center gap-2 bg-accent hover:bg-accent-dim text-bg-base px-4 py-2 rounded-md text-xs font-bold transition-all active:scale-95">
            <CheckCircle className="w-4 h-4" />
            Verify Record
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Metadata Sidebar */}
          <div className="w-full lg:w-1/3 border-r border-bg-border bg-bg-surface overflow-y-auto p-8 space-y-10">
            <section>
              <h2 className="font-display text-[11px] uppercase tracking-[2px] text-text-secondary mb-6 flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Classification
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-bg-base border border-bg-border rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Document Type</p>
                  <Badge variant={record.record_type as any} className="mt-1">{record.record_type || 'unclassified'}</Badge>
                </div>
                <div className="p-4 bg-bg-base border border-bg-border rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Input Source</p>
                  <Badge variant="default" className="mt-1">{record.input_type}</Badge>
                </div>
              </div>
            </section>

            <section>
                <div className="flex justify-between items-center mb-6">
                 <h2 className="font-display text-[11px] uppercase tracking-[2px] text-text-secondary flex items-center gap-2">
                    <Shield className="w-3 h-3 text-green" />
                    AI Confidence
                  </h2>
                  <span className="font-mono text-xs text-green">{((record.confidence || 0) * 100).toFixed(0)}% Match</span>
                </div>
                <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${(record.confidence || 0) > 0.8 ? 'bg-green' : (record.confidence || 0) > 0.5 ? 'bg-orange' : 'bg-red'}`}
                      style={{ width: `${(record.confidence || 0) * 100}%` }}
                    />
                </div>
            </section>

            <section>
              <h2 className="font-display text-[11px] uppercase tracking-[2px] text-text-secondary mb-6">Extracted Fields</h2>
              <div className="space-y-4">
                {record.metadata ? Object.entries(record.metadata as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-bg-border/50 pb-3">
                    <span className="text-text-secondary text-sm">{key}</span>
                    <span className="text-text-primary text-sm font-medium">{value}</span>
                  </div>
                )) : (
                  <p className="text-xs text-text-muted">No metadata extracted.</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="font-display text-[11px] uppercase tracking-[2px] text-text-secondary mb-4">AI Summary</h2>
              <p className="text-sm text-text-secondary leading-relaxed bg-bg-base p-4 rounded-lg border border-bg-border">
                {record.summary || "No summary available."}
              </p>
            </section>

            <section className="pt-6">
              <div className="flex items-center gap-3 text-text-muted">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">
                  {new Date(record.created_at).toLocaleString()}
                </span>
              </div>
            </section>
          </div>

          {/* OCR Content */}
          <div className="flex-1 bg-bg-base overflow-y-auto p-8 lg:p-12">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-bg-border">
                <h2 className="font-display font-bold text-xl">Extracted Text Content</h2>
                <button className="text-text-secondary hover:text-accent transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {signedUrl && (
                <div className="mb-8">
                  <DocumentPreview signedUrl={signedUrl} inputType={record.input_type} />
                </div>
              )}
              <ChunkedContent
                chunks={chunks ?? []}
                highlightChunk={highlightChunk}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
