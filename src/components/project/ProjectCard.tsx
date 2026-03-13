"use client"

import { Project } from "@/../types"
import { MoreVertical, Folder } from "lucide-react"

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}

export default function ProjectCard({ project, onDelete, onEdit }: ProjectCardProps) {
  return (
    <div 
      className="group relative bg-bg-surface border border-bg-border rounded-lg p-6 hover:border-bg-elevated transition-colors cursor-pointer"
      onClick={() => window.location.href = `/projects/${project.id}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-bg-elevated rounded border border-bg-border">
          <Folder className="w-5 h-5 text-accent" />
        </div>
        <button 
          className="p-1 hover:bg-bg-elevated rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            // Toggle menu logic
          }}
        >
          <MoreVertical className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      <h3 className="font-display text-lg font-bold text-text-primary mb-1 truncate">
        {project.name}
      </h3>
      
      <div className="flex items-center gap-3 text-sm">
        <span className="text-text-secondary">
          {project.record_count || 0} records
        </span>
        <span className="w-1 h-1 rounded-full bg-text-muted"></span>
        <span className="text-text-muted">
          {new Date(project.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
