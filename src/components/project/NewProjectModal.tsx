"use client"

import { useState } from "react"
import Modal from "@/components/ui/Modal"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleClose = () => {
    setName("")
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase
        .from('projects')
        .insert({ 
          name,
          user_id: user.id,
        })

      if (error) throw error
      
      setName("")
      handleClose()
      router.refresh()
    } catch (error) {
      console.error("Error creating project:", JSON.stringify(error, null, 2))
      alert(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 font-display">Project Name</label>
          <input
            autoFocus
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tax Returns 2024"
            className="w-full bg-bg-elevated border border-bg-border rounded-md px-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
          />
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-accent hover:bg-accent-dim text-bg-base px-6 py-2 rounded-md font-bold text-sm transition-all active:scale-95 shadow-lg shadow-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
