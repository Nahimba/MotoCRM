"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { UserPlus, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const full_name = formData.get("full_name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string

    try {
      const { error } = await supabase
        .from('accounts') // Keeping table name 'accounts' but UI says 'Clients'
        .insert([{ full_name, email, phone }])

      if (error) throw error

      toast.success("Client Registered!")
      router.push("/clients")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href="/clients" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold text-sm uppercase tracking-tighter">
        <ArrowLeft size={16} /> Back to Directory
      </Link>

      <header>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">Add New Client</h1>
        <p className="text-slate-500 font-medium">Register a new rider into the MotoCRM database.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-card border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Full Name</label>
          <input 
            name="full_name"
            required
            placeholder="e.g. Oleksandr Vavgorodnii"
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 transition-all font-bold text-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email Address</label>
            <input 
              name="email"
              type="email"
              placeholder="client@email.com"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 transition-all font-bold text-lg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Phone Number</label>
            <input 
              name="phone"
              placeholder="+380..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 transition-all font-bold text-lg"
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-primary text-black py-6 rounded-2xl font-black text-lg uppercase tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(255,165,0,0.15)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
          {loading ? 'Processing...' : 'Activate Client Profile'}
        </button>
      </form>
    </div>
  )
}