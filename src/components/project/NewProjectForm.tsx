"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import NewProjectModal from "./NewProjectModal"

export default function NewProjectForm({ label = "New Project" }: { label?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`${label === "New Project" ? "bg-accent hover:bg-accent-dim text-bg-base" : "text-accent border border-accent/20 hover:bg-accent/5"} px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all active:scale-95`}
      >
        <Plus className="w-4 h-4" />
        {label}
      </button>
      <NewProjectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
