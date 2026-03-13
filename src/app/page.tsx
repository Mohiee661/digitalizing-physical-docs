import Link from "next/link"
import { Plus, User, LogOut } from "lucide-react"
import ProjectCard from "@/components/project/ProjectCard"
import NewProjectForm from "@/components/project/NewProjectForm"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  const handleLogout = async () => {
    'use server'
    const supabaseAction = await createClient()
    await supabaseAction.auth.signOut()
    redirect('/login')
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-bg-border bg-bg-base px-6 flex items-center justify-between">
        <div className="font-display font-bold text-xl tracking-tight text-text-primary">
          RecordsVault
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-secondary text-sm hidden sm:inline">{user?.email}</span>
          <form action={handleLogout}>
            <button className="p-2 hover:bg-bg-elevated rounded-full border border-bg-border transition-colors text-text-secondary hover:text-red">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">Projects</h1>
              <span className="bg-bg-elevated text-accent px-2 py-0.5 rounded text-xs font-mono border border-bg-border">
                {projects?.length || 0}
              </span>
            </div>
            <p className="text-text-secondary text-sm">Manage and organize your digitized documents.</p>
          </div>
          
          <NewProjectForm />
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(projects as any[]).map((project: any) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-bg-border rounded-xl bg-bg-surface/30">
            <p className="text-text-secondary mb-4">No projects yet</p>
            <NewProjectForm label="Create your first project" />
          </div>
        )}
      </div>
    </main>
  )
}
