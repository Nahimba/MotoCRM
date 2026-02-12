"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { X, Phone, ChevronRight, User, FileText, Mail, Wallet, Clock } from "lucide-react"

export function ClientProfileModal({ client, onClose }: { client: any, onClose: () => void }) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDetails() {
      // Fetch live Source of Truth data from our new View
      const { data } = await supabase
        .from('client_training_details')
        .select('*')
        .eq('client_id', client.client_id)
        .maybeSingle()
      
      setDetails(data)
      setLoading(false)
    }
    fetchDetails()
  }, [client.client_id])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
        {/* Header Gradient */}
        <div className="relative h-24 bg-gradient-to-r from-primary/20 to-transparent" />

        <div className="px-8 pb-10 -mt-12 relative">
          <div className="h-24 w-24 rounded-3xl bg-[#151515] border-[4px] border-[#0D0D0D] overflow-hidden mb-6 shadow-xl">
            {client.client_avatar_url ? (
              <img src={client.client_avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/40"><User size={32} /></div>
            )}
          </div>

          <h3 className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none mb-1">
            {client.client_name} <span className="text-primary">{client.client_last_name}</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Client Dossier</p>
          
          {/* Live Data Cards (Source of Truth) */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Wallet size={12} />
                <span className="text-[9px] font-black uppercase">Wallet Balance</span>
              </div>
              <p className="text-lg font-black tabular-nums">
                {loading ? "..." : `$${details?.wallet_balance || 0}`}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Clock size={12} />
                <span className="text-[9px] font-black uppercase">Hours Left</span>
              </div>
              <p className="text-lg font-black tabular-nums">
                {loading ? "..." : `${details?.remaining_hours || 0}H`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${client.client_phone}`} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary/10 transition-colors">
              <Phone size={12} className="text-slate-500 mb-2" />
              <p className="text-[8px] font-black text-slate-500 uppercase">Phone</p>
              <p className="text-xs font-bold tabular-nums">{client.client_phone || 'N/A'}</p>
            </a>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <Mail size={12} className="text-slate-500 mb-2" />
              <p className="text-[8px] font-black text-slate-500 uppercase">Email</p>
              <p className="text-xs font-bold truncate">{client.client_email || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-6 p-5 bg-[#111] border border-white/5 rounded-3xl">
            <div className="flex items-center gap-2 mb-3 text-primary font-black text-[9px] uppercase tracking-widest">
              <FileText size={12} /> Mission Notes
            </div>
            <p className="text-[11px] text-slate-400 italic leading-relaxed">
              {client.client_notes || "No specific tactical notes for this candidate."}
            </p>
          </div>

          <button className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all flex items-center justify-center gap-2 group">
            Open Full Training History <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/50 rounded-full text-white hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>
    </div>
  )
}