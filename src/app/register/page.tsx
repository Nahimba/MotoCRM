"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Bike, Loader2, User, Mail, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'rider' }
        }
      })

      if (error) throw error

      toast.success("Account created! Check your email.")
      router.push('/')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center space-y-6 mb-8">
            <Bike className="text-primary mx-auto" size={32} />
            <h2 className="text-white font-bold text-lg uppercase italic tracking-widest flex items-center justify-center gap-2">
              <Shield size={16} className="text-primary" /> New Registration
            </h2>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none"
                  placeholder="Valentino Rossi"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none"
                  placeholder="rider@motocrm.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : "Finalize Protocol"}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/" className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-colors">
              Already Authorized? <span className="underline">Back to Entry</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}