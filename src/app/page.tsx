"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, Shield, User, ChevronRight, Bike } from "lucide-react"
import { toast } from "sonner"

export default function LandingPage() {
  const [role, setRole] = useState<'admin' | 'instructor' | 'rider'>('admin')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulation of role-based routing
    setTimeout(() => {
      setIsLoading(false)
      toast.success(`Access Granted: Welcome back, ${role}`)
      
      if (role === 'admin' || role === 'instructor') {
        router.push('/dashboard')
      } else {
        // Riders would go to a specialized limited view
        router.push('/dashboard/my-progress') 
      }
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* GLOW DECOR */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/10 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-md space-y-8">
        {/* BRANDING */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <Bike className="text-primary" size={32} />
          </div>
          <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter">
            MOTO<span className="text-primary text-outline-primary">CRM</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
            Precision Training Management
          </p>
        </div>

        {/* AUTH CARD */}
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-white font-bold text-lg uppercase tracking-widest">Entry Protocol</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase">Select your access level to continue</p>
            </div>

            {/* ROLE SELECTOR */}
            <div className="flex p-1 bg-black rounded-2xl border border-white/5">
              {(['admin', 'instructor', 'rider'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    role === r 
                      ? 'bg-primary text-black shadow-lg' 
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <input 
                  type="email" 
                  placeholder="IDENTIFICATION EMAIL"
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-xs font-bold placeholder:text-slate-700 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <input 
                  type="password" 
                  placeholder="ACCESS PASSCODE"
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-xs font-bold placeholder:text-slate-700 focus:border-primary outline-none transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Zap className="animate-pulse" size={16} />
                ) : (
                  <>Initialise Session <ChevronRight size={16} /></>
                )}
              </button>
            </form>
          </div>

          {/* BACKGROUND ICON DECOR */}
          <div className="absolute -right-10 -bottom-10 opacity-[0.02] text-white">
            <Shield size={200} />
          </div>
        </div>

        {/* FOOTER LINKS */}
        <div className="flex justify-between items-center px-4">
          <button className="text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">
            Forgot Passcode?
          </button>
          <div className="h-1 w-1 rounded-full bg-slate-800" />
          <button className="text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}