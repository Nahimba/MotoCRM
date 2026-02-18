"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { X, Phone, User, FileText, Mail, Wallet, Clock, Loader2 } from "lucide-react"

interface ClientProfileModalProps {
  client: any
  onClose: () => void
}

export function ClientProfileModal({ client, onClose }: ClientProfileModalProps) {
  const [details, setDetails] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Resolve the client ID (the primary key for the clients table)
  const targetClientId = client.client_id || client.id

  useEffect(() => {
    async function fetchFullDossier() {
      if (!targetClientId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 1. Fetch direct data from clients table joining the profiles table
        // This ensures phone and email are retrieved directly from the source
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select(`
            notes,
            profiles:profile_id (
              first_name,
              last_name,
              phone,
              email,
              avatar_url
            )
          `)
          .eq('id', targetClientId)
          .single()

        if (clientError) throw clientError
        
        // Supabase returns joined data as an object or array depending on schema
        // We cast/access the first element if it's an array to fix your TS error
        const rawProfile = Array.isArray(clientData?.profiles) 
          ? clientData?.profiles[0] 
          : clientData?.profiles

        // 2. Fetch financial and timing stats from the tactical dossier view
        const { data: dossierData } = await supabase
          .from('client_profile_dossier')
          .select('*')
          .eq('client_id', targetClientId)
          .maybeSingle()

          setProfile(rawProfile)
          setDetails({
            ...dossierData,
            notes: clientData?.notes || dossierData?.client_notes 
          })

        setProfile(clientData?.profiles)
        setDetails({
          ...dossierData,
          // Fallback to client table notes if the dossier view hasn't updated
          notes: clientData?.notes || dossierData?.client_notes 
        })

        // 3. Handle Avatar URL Resolution (Filename vs Public URL)
        const rawAvatar = rawProfile?.avatar_url
        if (rawAvatar) {
          if (rawAvatar.startsWith('http')) {
            setAvatarPreview(rawAvatar)
          } else {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(`avatars/${rawAvatar}`)
            setAvatarPreview(urlData.publicUrl)
          }
        }
      } catch (err) {
        console.error("Tactical Dossier Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchFullDossier()
  }, [targetClientId])

  // Resolve identity display logic
  const firstName = profile?.first_name || client.client_name || client.name
  const lastName = profile?.last_name || client.client_last_name || client.last_name

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg bg-[#0D0D0D] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* MOBILE DRAG HANDLE */}
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-4 md:hidden" />

        {/* Header Decorative Gradient */}
        <div className="relative h-20 md:h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />

        <div className="px-6 md:px-10 pb-10 -mt-10 relative">
          {/* Avatar Section */}
          <div className="flex justify-between items-end mb-6">
            <div className="h-40 w-40 md:h-48 md:w-48 rounded-3xl bg-[#151515] border-[4px] border-[#0D0D0D] overflow-hidden shadow-2xl relative group">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary/40">
                  <User size={32} />
                </div>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="mb-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-tighter">
              {details?.is_graduated ? "Graduate" : "Active Candidate"}
            </div>
          </div>

          {/* Identity */}
          <div className="space-y-1">
            <h3 className="text-2xl md:text-3xl font-black uppercase italic text-white tracking-tighter leading-none">
              {firstName}{" "}
              <span className="text-primary">{lastName}</span>
            </h3>
            <div className="flex items-center gap-2">
               <div className="h-px w-8 bg-primary/50" />
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Tactical Candidate Dossier
              </p>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-8 mb-6">
            {/* Wallet Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 text-primary mb-1 relative z-10">
                <Wallet size={12} />
                <span className="text-[9px] font-black uppercase tracking-tight">Wallet Balance</span>
              </div>
              <div className="text-xl font-black tabular-nums text-white relative z-10">
                {loading ? <div className="h-6 w-16 bg-white/10 animate-pulse rounded" /> : `${details?.wallet_balance || 0} ₴`}
              </div>
              <Wallet className="absolute -right-2 -bottom-2 w-12 h-12 text-white/5 rotate-12 group-hover:text-primary/10 transition-colors" />
            </div>

            {/* Hours Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 text-primary mb-1 relative z-10">
                <Clock size={12} />
                <span className="text-[9px] font-black uppercase tracking-tight">Remaining Time</span>
              </div>
              <div className="text-xl font-black tabular-nums text-white relative z-10">
                {loading ? <div className="h-6 w-12 bg-white/10 animate-pulse rounded" /> : `${details?.remaining_hours || 0}H`}
              </div>
              <Clock className="absolute -right-2 -bottom-2 w-12 h-12 text-white/5 -rotate-12 group-hover:text-primary/10 transition-colors" />
            </div>
          </div>

          {/* Contact Info (Fetched from profiles table) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a 
              href={profile?.phone ? `tel:${profile.phone}` : "#"} 
              className={`p-4 bg-white/5 rounded-2xl border border-white/5 transition-all group flex flex-col ${profile?.phone ? 'hover:bg-primary hover:text-black cursor-pointer' : 'opacity-50 pointer-events-none'}`}
            >
              <Phone size={14} className="text-primary mb-2 group-hover:text-black transition-colors" />
              <p className="text-[8px] font-black uppercase opacity-60">Comm-Link</p>
              <p className="text-xs font-bold tabular-nums truncate">
                {loading ? "..." : (profile?.phone || 'NO DATA')}
              </p>
            </a>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col">
              <Mail size={14} className="text-primary mb-2" />
              <p className="text-[8px] font-black uppercase opacity-60">Registry Email</p>
              <p className="text-xs font-bold truncate text-white">
                {loading ? "..." : (profile?.email || 'NO DATA')}
              </p>
            </div>
          </div>

          {/* Instructor Notes Section */}
          <div className="mt-6 p-5 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
               <FileText size={40} />
            </div>
            <div className="flex items-center gap-2 mb-3 text-primary font-black text-[9px] uppercase tracking-widest relative z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Instructor Intel
            </div>
            <p className="text-[11px] md:text-xs text-slate-400 italic leading-relaxed relative z-10">
              {loading ? "Decrypting dossiers..." : (details?.notes || "No specific tactical notes recorded for this candidate.")}
            </p>
          </div>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-red-500/20 transition-all border border-white/10"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}