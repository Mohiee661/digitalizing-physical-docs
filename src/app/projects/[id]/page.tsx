import { 
  ArrowLeft, 
  Files, 
  MessageSquare, 
  Download, 
  Search, 
  Plus, 
  Type, 
  Filter,
  MoreVertical,
  FileText,
  Image as ImageIcon,
  Grid,
  FileCode,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import Badge from "@/components/ui/Badge"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ProjectPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ tab?: string, q?: string }>
}) {
  const { id } = await params
  const { tab = 'files', q = '' } = await searchParams
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) redirect('/')

  const { data: records } = await supabase
    .from('records')
    .select('*')
    .eq('project_id', id)
    .ilike('title', `%${q}%`)
    .order('date_digitized', { ascending: false })

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-green"
    if (score >= 0.5) return "bg-orange"
    return "bg-red"
  }

  const renderFilesTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
          <input
            name="q"
            type="text"
            placeholder="Search records..."
            defaultValue={q}
            className="w-full bg-bg-surface border border-bg-border rounded-md pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
          />
        </form>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-bg-surface border border-bg-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-bg-elevated transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-bg-surface border border-bg-border px-4 py-2.5 rounded-md text-sm font-medium hover:bg-bg-elevated transition-colors">
            <Type className="w-4 h-4" />
            Type
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-accent hover:bg-accent-dim text-bg-base px-4 py-2.5 rounded-md text-sm font-bold transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

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
              {records && records.length > 0 ? records.map((record) => (
                <tr key={record.id} className="hover:bg-bg-elevated/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <Link href={`/projects/${id}/records/${record.id}`} className="flex items-center gap-3">
                      <div className="p-2 bg-bg-elevated rounded border border-bg-border">
                        {record.input_type === 'pdf' && <FileText className="w-4 h-4 text-blue" />}
                        {record.input_type === 'image' && <ImageIcon className="w-4 h-4 text-green" />}
                        {(record.input_type === 'text' || record.input_type === 'free_text') && <FileCode className="w-4 h-4 text-orange" />}
                      </div>
                      <div className="max-w-[200px]">
                        <p className="font-medium text-text-primary truncate">{record.title || "Untitled Record"}</p>
                        <p className="text-xs text-text-muted uppercase tracking-tighter">{record.input_type}</p>
                      </div>
                      {record.error_flag && <AlertCircle className="w-4 h-4 text-red shrink-0" />}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={record.record_type as any}>{record.record_type || 'unclassified'}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono text-text-secondary">{( (record.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getConfidenceColor(record.confidence || 0)} transition-all duration-500`}
                          style={{ width: `${(record.confidence || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary font-mono text-xs">
                    {new Date(record.date_digitized).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-bg-elevated rounded transition-colors text-text-secondary">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-bg-elevated rounded transition-colors text-text-secondary">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                        No records found for this project.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderChatTab = () => (
    <div className="flex flex-col h-[600px] border border-bg-border rounded-xl bg-bg-surface overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex justify-center">
            <Badge variant="default" className="bg-bg-elevated py-1 px-4">Chat History</Badge>
        </div>
        
        <div className="flex gap-4 max-w-[80%]">
          <div className="w-8 h-8 rounded bg-bg-elevated border border-bg-border flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-accent">AI</span>
          </div>
          <div className="bg-bg-base border border-bg-border rounded-2xl rounded-tl-none p-4">
            <p className="text-sm leading-relaxed text-text-primary">
              I'm ready to assist with your documents in <strong>{project.name}</strong>. What would you like to know?
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-bg-border bg-bg-surface">
        <div className="relative">
          <input
            type="text"
            placeholder="Ask about your project..."
            className="w-full bg-bg-elevated border border-bg-border rounded-md px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
          />
          <button className="absolute right-2 top-2 p-1.5 bg-accent text-bg-base rounded hover:bg-accent-dim transition-colors">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-3 text-center uppercase tracking-widest">
          AI answers based on your project records only
        </p>
      </div>
    </div>
  )

  const renderExportTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { title: "Spreadsheet", desc: "All records as a flat CSV file", icon: <Grid className="w-6 h-6" />, type: "CSV" },
        { title: "JSON Dump", desc: "Full structured data export", icon: <FileCode className="w-6 h-6" />, type: "JSON" },
        { title: "PDF Report", desc: "Formatted report of all records", icon: <FileText className="w-6 h-6" />, type: "PDF" },
      ].map((opt) => (
        <div key={opt.type} className="bg-bg-surface border border-bg-border rounded-xl p-8 flex flex-col items-center text-center group hover:border-accent/20 transition-all cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-bg-border flex items-center justify-center mb-6 text-text-secondary group-hover:text-accent group-hover:bg-accent/5 transition-colors">
            {opt.icon}
          </div>
          <h3 className="font-display font-bold text-lg mb-2">{opt.title}</h3>
          <p className="text-text-secondary text-sm mb-8 leading-relaxed">{opt.desc}</p>
          <button className="w-full py-2.5 rounded-md border border-bg-border font-bold text-xs uppercase tracking-widest hover:bg-bg-elevated transition-colors">
            Export {opt.type}
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <main className="min-h-screen flex flex-col bg-bg-base">
      {/* Project Navbar */}
      <nav className="h-16 border-b border-bg-border px-6 flex items-center gap-6">
        <Link href="/" className="p-2 hover:bg-bg-elevated rounded-md transition-colors text-text-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="h-6 w-[1px] bg-bg-border" />
        <h1 className="font-display font-bold text-lg text-text-primary tracking-tight">
          {project.name}
        </h1>
      </nav>

      {/* Tabs */}
      <div className="px-6 md:px-12 border-b border-bg-border overflow-x-auto">
          <div className="max-w-7xl mx-auto flex gap-8">
            {[
              { id: 'files', label: 'Files', icon: <Files className="w-4 h-4" /> },
              { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
            ].map((t) => (
              <Link
                key={t.id}
                href={`?tab=${t.id}`}
                className={`flex items-center gap-2 py-4 text-sm font-medium transition-all relative shrink-0 ${
                  tab === t.id ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.icon}
                {t.label}
                {tab === t.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                )}
              </Link>
            ))}
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {tab === 'files' && renderFilesTab()}
        {tab === 'chat' && renderChatTab()}
        {tab === 'export' && renderExportTab()}
      </div>
    </main>
  )
}
