"use client"

import { useState } from "react"
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const toggleMode = () => {
    setIsSignup(!isSignup)
    setEmail("")
    setPassword("")
    setError(null)
    setSuccess(null)
    setShowPassword(false)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) setError(error.message)
      else {
        setSuccess("Check your email for the confirmation link!")
        setEmail("")
        setPassword("")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setError(error.message)
      else router.push("/")
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center p-6 grid-pattern">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-4xl font-bold font-display tracking-tight text-text-primary">
            RecordsVault
          </h1>
          <p className="text-text-secondary text-sm tracking-wide">
            Digitize. Extract. Retrieve.
          </p>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 font-display">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h2>

          <form className="space-y-4" onSubmit={handleAuth}>
            {error && (
              <div className="p-3 bg-red/10 border border-red/20 rounded text-red text-xs">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green/10 border border-green/20 rounded text-green text-xs">
                {success}
              </div>
            )}
            <div>
              <label className="block mb-2 font-display">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-bg-elevated border border-bg-border rounded-md pl-10 pr-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-display">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-elevated border border-bg-border rounded-md pl-10 pr-12 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dim text-bg-base py-3 rounded-md font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-accent/10 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignup ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-bg-border text-center">
            <button
              onClick={toggleMode}
              className="text-text-secondary text-sm hover:text-accent transition-colors"
            >
              {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
        
        <p className="mt-10 text-center text-text-muted text-xs">
          Built with precision. © 2025 RecordsVault.
        </p>
      </div>
    </main>
  )
}
