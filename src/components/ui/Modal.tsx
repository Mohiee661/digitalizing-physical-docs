"use client"

import React, { useEffect } from "react"
import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative bg-bg-surface border border-bg-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-6 border-b border-bg-border">
          <h2 className="font-display text-lg font-bold text-text-primary tracking-tight">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-bg-elevated rounded-md transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
