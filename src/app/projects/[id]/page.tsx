import { 
  ArrowLeft, 
  Files, 
  MessageSquare, 
  Download
} from "lucide-react"
import Link from "next/link"
import ChatPanel from "@/components/project/ChatPanel"
import ExportPanel from "@/components/project/ExportPanel"
import FilesTab from "@/components/project/FilesTab"
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
    .order('created_at', { ascending: false })

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-green"
    if (score >= 0.5) return "bg-orange"
    return "bg-red"
  }

  const renderFilesTab = () => (
    <FilesTab
      projectId={id}
      initialRecords={(records ?? []) as any}
      searchQuery={q}
    />
  )

  const renderChatTab = () => (
    <ChatPanel projectId={id} projectName={project.name} />
  )

  const renderExportTab = () => (
    <ExportPanel projectId={id} projectName={project.name} />
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
