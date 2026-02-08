"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import RiderForm from "../../form-component"
import { Loader2, ShieldAlert, Bike } from "lucide-react"

// Next.js 15 Type Definition
type Props = {
  params: Promise<{ id: string }>
}

export default function EditRiderPage({ params }: Props) {
  // Unwrap the params Promise for Next.js 15
  const resolvedParams = use(params)
  const id = resolvedParams.id
  
  const [rider, setRider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function getRider() {
      if (!id) return

      try {
        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        
        if (!data) {
          setError("Rider not found in the database.")
        } else {
          setRider(data)
        }
      } catch (err: any) {
        console.error("Fetch Error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    getRider()
  }, [id])

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={48} strokeWidth={1} />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase text-white tracking-[0.4em] animate-pulse">
            Authenticating Access
          </p>
          <p className="text-[8px] text-slate-500 font-bold uppercase mt-2">
            Retrieving Rider Dossier...
          </p>
        </div>
      </div>
    )
  }

  // --- ERROR STATE ---
  if (error || !rider) {
    return (
      <div className="h-screen flex items-center justify-center bg-black p-6">
        <div className="max-w-md w-full bg-[#111] border border-red-500/20 rounded-[2.5rem] p-10 text-center space-y-6">
          <div className="bg-red-500/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-white font-black uppercase italic tracking-tighter text-2xl">Target Not Found</h2>
            <p className="text-slate-500 text-xs leading-relaxed px-4">
              The rider with the specified ID could not be located or has been decommissioned from the fleet.
            </p>
          </div>
          <button 
            onClick={() => router.push('/staff/clients')}
            className="w-full bg-white/5 hover:bg-white text-white hover:text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 transition-all"
          >
            Return to Roster
          </button>
        </div>
      </div>
    )
  }

  // --- SUCCESS STATE: RENDERS THE FORM ---
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-12 px-4 max-w-5xl">
        <div className="mb-8 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
                <Bike className="text-primary" size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Modify Intel</h1>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Updating data for: {rider.name} {rider.last_name}</p>
            </div>
        </div>
        <RiderForm initialData={rider} id={id} />
      </div>
    </div>
  )
}