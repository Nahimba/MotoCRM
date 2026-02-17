// app/[locale]/staff/clients/[id]/edit/page.tsx
"use client" // CRITICAL: This allows the page to run on mobile/PC

import { useEffect, useState, use } from "react"
import ClientForm from "@/components/staff/ClientForm"
import { supabase } from "@/lib/supabase" // Use the standard Client SDK
import { Loader2, AlertTriangle } from "lucide-react"

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise (Next 15 style)
  const resolvedParams = use(params)
  const id = resolvedParams.id

  const [initialData, setInitialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRiderData() {
      try {
        setLoading(true)
        
        // Fetch using the Client SDK
        const { data, error: sbError } = await supabase
          .from('clients')
          .select(`
            *,
            profiles:profile_id (*)
          `)
          .eq('id', id)
          .single()

        if (sbError) throw sbError
        if (!data) throw new Error("Rider not found in the database")

        setInitialData(data)
      } catch (err: any) {
        console.error("Fetch Failure:", err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRiderData()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-red-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Retrieving_Data...</p>
      </div>
    )
  }

  if (error || !initialData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-red-600">
        <AlertTriangle size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-white">Error: {error || "Not Found"}</p>
        <button onClick={() => window.location.reload()} className="text-[10px] underline">RETRY_CONNECTION</button>
      </div>
    )
  }

  return (
    <div className="py-10 px-4">
      {/* Pass the ID and the Data to your Locked-in Red Style Form */}
      <ClientForm initialData={initialData} id={id} />
    </div>
  )
}