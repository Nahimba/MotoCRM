"use client"

import { X, MapPin, Phone, ChevronRight, User, FileText, Globe, Mail } from "lucide-react"

export function ClientProfileModal({ client, onClose }: { client: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
        <div className="relative h-32 bg-gradient-to-r from-primary/30 to-transparent" />

        <div className="px-10 pb-12 -mt-16 relative">
          <div className="h-28 w-28 rounded-[2rem] bg-[#151515] border-[4px] border-[#0D0D0D] overflow-hidden mb-6">
            {client.client_avatar_url ? (
              <img src={client.client_avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/40"><User size={40} /></div>
            )}
          </div>

          <h3 className="text-3xl font-black uppercase italic text-white tracking-tighter leading-none">
            {client.client_name} <span className="text-primary">{client.client_last_name}</span>
          </h3>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <a href={`tel:${client.client_phone}`} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary/10 transition-colors">
              <Phone size={14} className="text-primary mb-2" />
              <p className="text-[8px] font-black text-slate-500 uppercase">Comm Link</p>
              <p className="text-xs font-bold tabular-nums">{client.client_phone || 'N/A'}</p>
            </a>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <Mail size={14} className="text-primary mb-2" />
              <p className="text-[8px] font-black text-slate-500 uppercase">Email</p>
              <p className="text-xs font-bold truncate">{client.client_email || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-6 p-6 bg-primary/5 border border-primary/10 rounded-[2.5rem]">
            <div className="flex items-center gap-2 mb-2 text-primary font-black text-[9px] uppercase tracking-widest">
              <FileText size={12} /> Tactical Notes
            </div>
            <p className="text-[11px] text-slate-400 italic leading-relaxed">
              {client.client_notes || "No tactical notes available."}
            </p>
          </div>

          <button className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase italic text-[10px] hover:bg-primary transition-all flex items-center justify-center gap-2">
            Access Full Portfolio <ChevronRight size={14} />
          </button>
        </div>
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/50 rounded-full text-white">
          <X size={20} />
        </button>
      </div>
    </div>
  )
}