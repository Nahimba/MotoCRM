"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, ChevronRight, Bike, Loader2, Mail, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

// --- CONFIGURATION ---
const DEV_ACCOUNTS = {
  admin: { email: "admin@motocrm.local", password: "password123" },
  instructor: { email: "coach@motocrm.local", password: "password123" },
  rider: { email: "rider@motocrm.local", password: "password123" },
}

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoLogging, setIsAutoLogging] = useState(false)
  const router = useRouter()

  // --- 1. THE AUTO-BYPASS LOGIC ---
  useEffect(() => {
    const checkSession = async () => {
      const isLocal = window.location.hostname === "localhost"
      // The "manualLogout" flag is set in your AuthContext or Sidebar signOut function
      const justLoggedOut = sessionStorage.getItem('manualLogout')

      // IF LOGGED OUT MANUALLY: Break the loop and stay on this page
      if (justLoggedOut) {
        sessionStorage.removeItem('manualLogout')
        setIsAutoLogging(false)
        return 
      }

      // DEV AUTO-LOGIN: Speed up development workflow
      if (isLocal) {
        setIsAutoLogging(true)
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          router.push('/dashboard')
        } else {
          // No session found? Attempt auto-auth as Admin
          await handleLogin(null, 'admin')
        }
      }
    }

    checkSession()
  }, [])

  // --- 2. THE LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent | null, devRole?: keyof typeof DEV_ACCOUNTS) => {
    if (e) e.preventDefault()
    setIsLoading(true)

    const targetEmail = devRole ? DEV_ACCOUNTS[devRole].email : email
    const targetPassword = devRole ? DEV_ACCOUNTS[devRole].password : password

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      })

      if (error) {
        if (!devRole) toast.error(error.message)
        setIsAutoLogging(false) // Stop loader if login fails
        return
      }

      toast.success("Protocol Initialised")
      router.push('/dashboard')
    } catch (err) {
      if (!devRole) toast.error("Connection Fault")
    } finally {
      setIsLoading(false)
      // Only stop auto-logging loader if we aren't redirecting
      if (!devRole) setIsAutoLogging(false)
    }
  }

  // PREVENT UI FLICKER: Show a high-tech loader during dev auto-checks
  if (isAutoLogging) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Resuming Dev Protocol...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/10 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-md space-y-8">
        {/* BRANDING */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <Bike className="text-primary" size={32} />
          </div>
          <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter">
            MOTO<span className="text-primary">CRM</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
            Precision Training Management
          </p>
        </div>

        {/* AUTH CARD */}
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-white font-bold text-lg uppercase tracking-widest italic flex items-center justify-center gap-2">
                <Shield size={16} className="text-primary" /> Entry Protocol
              </h2>
            </div>

            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50 transition-all"
                    placeholder="rider@motocrm.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Security Key</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>Initialize Session <ChevronRight size={16} /></>
                )}
              </button>
            </form>

            {/* DEV QUICK-SELECT */}
            <div className="pt-4 border-t border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase text-center mb-3 tracking-widest">Rapid Access Overrides</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DEV_ACCOUNTS) as Array<keyof typeof DEV_ACCOUNTS>).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleLogin(null, role)}
                    className="py-2 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-slate-400 uppercase hover:text-primary hover:border-primary/30 transition-all"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center pt-2">
              <Link href="/register" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-primary transition-colors">
                New Protocol? <span className="text-white underline underline-offset-4">Register</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}