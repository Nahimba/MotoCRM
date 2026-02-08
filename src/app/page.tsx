"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, ChevronRight, Bike, Loader2, Mail, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

const DEV_ACCOUNTS = {
  admin: { email: "admin@motocrm.local", password: "password123", role: 'admin' },
  instructor: { email: "coach@motocrm.local", password: "password123", role: 'instructor' },
  rider: { email: "rider@motocrm.local", password: "password123", role: 'rider' },
}

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoLogging, setIsAutoLogging] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const isLocal = window.location.hostname === "localhost"
      const justLoggedOut = sessionStorage.getItem('manualLogout')

      if (justLoggedOut) {
        sessionStorage.removeItem('manualLogout')
        setIsAutoLogging(false)
        return 
      }

      if (isLocal) {
        setIsAutoLogging(true)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const role = session.user.user_metadata.role
          handleRedirect(role)
        } else {
          await handleLogin(null, 'admin')
        }
      }
    }
    checkSession()
  }, [])

  const handleRedirect = (role: string | undefined) => {
    
    if (!role) {
      console.error("No role found in metadata, defaulting to /account");
    }
  
    switch (role) {
      case 'admin': router.push('/admin'); break;
      case 'instructor': router.push('/staff'); break;
      default: router.push('/account'); break;
    }
  }

  const handleLogin = async (e: React.FormEvent | null, devRole?: keyof typeof DEV_ACCOUNTS) => {
    if (e) e.preventDefault()
    setIsLoading(true)

    const targetEmail = devRole ? DEV_ACCOUNTS[devRole].email : email
    const targetPassword = devRole ? DEV_ACCOUNTS[devRole].password : password

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      })

      if (error) {
        if (!devRole) toast.error(error.message)
        setIsAutoLogging(false)
        return
      }

      toast.success("Identity Verified")
      handleRedirect(data.user?.user_metadata.role || 'rider')
    } catch (err) {
      if (!devRole) toast.error("System Connection Error")
    } finally {
      setIsLoading(false)
      if (!devRole) setIsAutoLogging(false)
    }
  }

  if (isAutoLogging) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Initializing Protocol...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/10 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <Bike className="text-primary" size={32} />
          </div>
          <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter">
            MOTO<span className="text-primary">CRM</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Precision Management</p>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative">
          <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50"
                  placeholder="Email"
                />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50"
                  placeholder="Security Key"
                />
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <>Initialize Session <ChevronRight size={16} /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DEV_ACCOUNTS) as Array<keyof typeof DEV_ACCOUNTS>).map((role) => (
                <button
                  key={role} type="button" onClick={() => handleLogin(null, role)}
                  className="py-2 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-slate-400 uppercase hover:text-primary transition-all"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}