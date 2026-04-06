"use client"

import { Project } from "@/../types"
import { Folder } from "lucide-react"

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div
      className="group relative bg-bg-surface border border-bg-border rounded-xl p-6 hover:border-accent/20 hover:bg-bg-elevated/30 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 cursor-pointer"
      onClick={() => window.location.href = `/projects/${project.id}`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="p-2.5 bg-bg-elevated rounded-lg border border-bg-border group-hover:border-accent/20 group-hover:bg-accent/5 transition-colors">
          <Folder className="w-5 h-5 text-accent" />
        </div>
        <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 bg-bg-elevated rounded border border-bg-border">
          {new Date(project.created_at).toLocaleDateString()}
        </span>
      </div>

      <h3 className="font-display text-base font-bold text-text-primary mb-2 truncate group-hover:text-accent transition-colors">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-xs text-text-muted mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
      )}

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-bg-border/50">
        <span className="text-xs text-text-secondary">
          {project.type ?? "General"}
        </span>
      </div>
    </div>
  )
}
