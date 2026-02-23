"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { X, Phone, User, FileText, Mail, Clock, Loader2, ShieldCheck, MapPin } from "lucide-react"

interface ClientProfileModalProps {
  client: any // Объект урока из расписания
  onClose: () => void
}

export function ClientProfileModal({ client, onClose }: ClientProfileModalProps) {
  const [details, setDetails] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Получаем ID клиента и ID конкретного пакета из пропсов
  const targetClientId = client.client_id || client.id
  const targetPackageId = client.course_package_id || client.package_id

  useEffect(() => {
    async function fetchFullDossier() {
      if (!targetClientId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 1. Загружаем основные данные профиля
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select(`
            notes,
            gear_type,
            profiles:profile_id (
              first_name,
              last_name,
              phone,
              email,
              avatar_url,
              address
            )
          `)
          .eq('id', targetClientId)
          .single()

        if (clientError) throw clientError
        
        const rawProfile = Array.isArray(clientData?.profiles) 
          ? clientData?.profiles[0] 
          : clientData?.profiles

        // 2. Загружаем данные из вьюхи по конкретному пакету
        // Фильтруем по client_id И package_id для точности
        const { data: dossierData } = await supabase
          .from('client_profile_dossier')
          .select('*')
          .eq('client_id', targetClientId)
          .eq('package_id', targetPackageId)
          .maybeSingle()

        setProfile(rawProfile)
        setDetails({
          ...dossierData,
          gear_type: clientData?.gear_type,
          notes: clientData?.notes || dossierData?.client_notes 
        })

        // 3. Обработка Аватара
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
  }, [targetClientId, targetPackageId])

  const firstName = profile?.first_name || client.client_name || client.name || "Unknown"
  const lastName = profile?.last_name || client.client_last_name || client.last_name || ""

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg bg-[#0A0A0A] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 md:hidden shrink-0" />

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Decorative Header */}
          <div className="relative h-24 md:h-32 bg-gradient-to-br from-primary/20 via-zinc-900 to-transparent" />

          <div className="px-6 md:px-10 pb-10 -mt-12 relative">
            {/* Avatar Section */}
            <div className="flex justify-between items-end mb-6">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-[2.5rem] bg-zinc-900 border-[6px] border-[#0A0A0A] overflow-hidden shadow-2xl relative">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-800">
                    <User size={48} strokeWidth={1} />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2 mb-2">
                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${details?.is_graduated ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  {details?.is_graduated ? "Graduate" : "Active"}
                </div>
                {details?.gear_type && (
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase italic">
                    {details.gear_type}
                  </div>
                )}
              </div>
            </div>

            {/* Identity */}
            <div className="space-y-1">
              <h3 className="text-3xl md:text-4xl font-black uppercase italic text-white tracking-tighter leading-none">
                {firstName} <span className="text-primary">{lastName}</span>
              </h3>
            </div>
            
            {/* Training Stats - Focused on the current package */}
            <div className="grid grid-cols-1 gap-4 mt-8 mb-6">
              {/* Active Course Name */}
              <div className="p-5 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Active Mission</p>
                <div className="text-xl font-black uppercase italic text-primary relative z-10 truncate">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (details?.active_course_name || "Training Mission")}
                </div>
              </div>

              {/* Remaining Hours */}
              <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20 relative overflow-hidden group">
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Remaining Time</p>
                    <div className="text-4xl font-black tabular-nums text-white">
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${details?.remaining_hours || 0}H`}
                    </div>
                  </div>
                  <Clock className="w-12 h-12 text-primary/20 rotate-12" />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <a 
                href={profile?.phone ? `tel:${profile.phone}` : "#"} 
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${profile?.phone ? 'bg-white/5 border-white/5 hover:bg-primary hover:text-black hover:border-primary' : 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'}`}
              >
                <div className="p-2 bg-black/20 rounded-lg"><Phone size={16} /></div>
                <span className="text-sm font-black tabular-nums tracking-tight">{profile?.phone || 'NO PHONE'}</span>
              </a>

              <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="p-2 bg-black/20 rounded-lg"><Mail size={16} className="text-primary" /></div>
                <span className="text-sm font-bold truncate text-white tracking-tight">{profile?.email || 'NO EMAIL'}</span>
              </div>

              {profile?.address && (
                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="p-2 bg-black/20 rounded-lg"><MapPin size={16} className="text-primary" /></div>
                  <span className="text-xs font-bold text-slate-300 leading-tight">{profile.address}</span>
                </div>
              )}
            </div>

            {/* Tactical Notes */}
            <div className="mt-6 p-6 bg-primary/5 border border-primary/10 rounded-[2rem] relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Notes about Client</span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                {loading ? "Decrypting..." : (details?.notes || "No specific mission notes recorded for this pilot.")}
              </p>
              <FileText className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/5 -rotate-12" />
            </div>
          </div>
        </div>
        
        {/* Actions / Close Button */}
        <div className="p-6 border-t border-white/5 bg-[#0D0D0D] md:hidden">
            <button 
              onClick={onClose}
              className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl active:scale-95 transition-all shadow-xl"
            >
              Back
            </button>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-white rounded-full transition-all border border-white/10"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}