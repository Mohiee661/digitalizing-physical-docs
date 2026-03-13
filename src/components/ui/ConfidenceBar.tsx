import React from "react"

interface ConfidenceBarProps {
  score: number
  className?: string
}

export default function ConfidenceBar({ score, className = "" }: ConfidenceBarProps) {
  const getColor = (s: number) => {
    if (s >= 0.8) return "bg-green"
    if (s >= 0.5) return "bg-orange"
    return "bg-red"
  }

  return (
    <div className={`w-full ${className}`}>
        <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
            <div 
                className={`h-full ${getColor(score)} transition-all duration-700 ease-out`}
                style={{ width: `${score * 100}%` }}
            />
        </div>
    </div>
  )
}
