"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { X, Phone, ChevronRight, User, FileText, Mail, Wallet, Clock, Loader2 } from "lucide-react"

interface ClientProfileModalProps {
  client: any
  onClose: () => void
}

export function ClientProfileModal({ client, onClose }: ClientProfileModalProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Resolve the client ID regardless of how it's passed from the parent
  const targetClientId = client.client_id || client.id

  useEffect(() => {
    async function fetchDetails() {
      if (!targetClientId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Fetch live Source of Truth data from the 'client_training_details' View
        const { data, error } = await supabase
          .from('client_training_details')
          .select('*')
          .eq('client_id', targetClientId)
          .maybeSingle()

        if (error) throw error
        setDetails(data)
      } catch (err) {
        console.error("Dossier Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [targetClientId])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header Decorative Gradient */}
        <div className="relative h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />

        <div className="px-8 pb-10 -mt-12 relative">
          {/* Avatar Section */}
          <div className="h-24 w-24 rounded-3xl bg-[#151515] border-[4px] border-[#0D0D0D] overflow-hidden mb-6 shadow-xl relative group">
            {client.client_avatar_url || client.avatar_url ? (
              <img 
                src={client.client_avatar_url || client.avatar_url} 
                alt="Client Avatar" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/40">
                <User size={32} />
              </div>
            )}
          </div>

          {/* Identity */}
          <h3 className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none mb-1">
            {client.client_name || client.name}{" "}
            <span className="text-primary">{client.client_last_name || client.last_name}</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">
            Tactical Candidate Dossier
          </p>
          
          {/* Source of Truth Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Wallet Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="flex items-center gap-2 text-primary mb-1 relative z-10">
                <Wallet size={12} />
                <span className="text-[9px] font-black uppercase">Wallet Balance</span>
              </div>
              <div className="text-lg font-black tabular-nums text-white relative z-10">
                {loading ? (
                  <div className="h-6 w-16 bg-white/10 animate-pulse rounded" />
                ) : (
                  `$${details?.wallet_balance || 0}`
                )}
              </div>
              <Wallet className="absolute -right-2 -bottom-2 w-12 h-12 text-white/5 rotate-12" />
            </div>

            {/* Hours Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="flex items-center gap-2 text-primary mb-1 relative z-10">
                <Clock size={12} />
                <span className="text-[9px] font-black uppercase">Remaining Time</span>
              </div>
              <div className="text-lg font-black tabular-nums text-white relative z-10">
                {loading ? (
                  <div className="h-6 w-12 bg-white/10 animate-pulse rounded" />
                ) : (
                  `${details?.remaining_hours || 0}H`
                )}
              </div>
              <Clock className="absolute -right-2 -bottom-2 w-12 h-12 text-white/5 -rotate-12" />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <a 
              href={`tel:${client.client_phone || client.phone}`} 
              className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary/10 transition-all group"
            >
              <Phone size={12} className="text-slate-500 mb-2 group-hover:text-primary transition-colors" />
              <p className="text-[8px] font-black text-slate-500 uppercase">Comm-Link</p>
              <p className="text-xs font-bold tabular-nums text-white">
                {client.client_phone || client.phone || 'NO DATA'}
              </p>
            </a>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <Mail size={12} className="text-slate-500 mb-2" />
              <p className="text-[8px] font-black text-slate-500 uppercase">Registry Email</p>
              <p className="text-xs font-bold truncate text-white">
                {client.client_email || client.email || 'NO DATA'}
              </p>
            </div>
          </div>

          {/* Instructor Notes Section */}
          <div className="mt-6 p-5 bg-[#111] border border-white/5 rounded-3xl relative">
            <div className="flex items-center gap-2 mb-3 text-primary font-black text-[9px] uppercase tracking-widest">
              <FileText size={12} /> Instructor Intel
            </div>
            <p className="text-[11px] text-slate-400 italic leading-relaxed">
              {client.client_notes || client.notes || "No specific tactical notes recorded for this candidate."}
            </p>
          </div>

          {/* Action Button */}
          <button className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all flex items-center justify-center gap-2 group shadow-xl shadow-white/5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Deploy Full Training History"}
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors border border-white/10"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}