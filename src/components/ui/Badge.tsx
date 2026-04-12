import React from "react"

interface BadgeProps {
  children: React.ReactNode
  variant?: string
  className?: string
}

const VARIANT_MAP: Record<string, string> = {
  // Semantic variants
  default: "border-bg-border text-text-secondary bg-bg-elevated",
  success: "border-green/30 text-green bg-green/5",
  warning: "border-orange/30 text-orange bg-orange/5",
  error: "border-red/30 text-red bg-red/5",
  info: "border-blue/30 text-blue bg-blue/5",
  accent: "border-accent/30 text-accent bg-accent/5",

  // Record-type variants (document classification)
  legal: "border-blue/30 text-blue bg-blue/5",
  medical: "border-red/30 text-red bg-red/5",
  financial: "border-green/30 text-green bg-green/5",
  personal: "border-orange/30 text-orange bg-orange/5",
  public: "border-bg-border text-text-secondary bg-bg-elevated",
  identity: "border-accent/30 text-accent bg-accent/5",
  unclassified: "border-bg-border text-text-muted bg-bg-elevated",
}

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const style = VARIANT_MAP[variant ?? "default"] ?? VARIANT_MAP.default

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${style} ${className}`}>
      {children}
    </span>
  )
}
