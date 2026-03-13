import React from "react"

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent'
  className?: string
}

export default function Badge({ children, variant = 'default', className = "" }: BadgeProps) {
  const variants = {
    default: "border-bg-border text-text-secondary bg-bg-elevated",
    success: "border-green/30 text-green bg-green/5",
    warning: "border-orange/30 text-orange bg-orange/5",
    error: "border-red/30 text-red bg-red/5",
    info: "border-blue/30 text-blue bg-blue/5",
    accent: "border-accent/30 text-accent bg-accent/5",
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
