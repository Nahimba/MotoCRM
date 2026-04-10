"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { 
  User as UserIcon, Mail, Phone, Shield, Save, Loader2, 
  Globe, Info, MapPin, Camera, Trash2, Upload
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"


import { AvatarModal } from "@/components/avatar/AvatarModal"


export default function ProfilePage() {
  const t = useTranslations("Profile")
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const role = user?.app_metadata?.role;
  
  const [updating, setUpdating] = useState(false)
  const [fetchingExtended, setFetchingExtended] = useState(true)
  const [locations, setLocations] = useState<any[]>([])
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const [formData, setFormData] = useState({
    //full_name: profile?.full_name || "",
    first_name: profile?.first_name || "",
    middle_name: profile?.middle_name || "",
    last_name: profile?.last_name || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    social_link: profile?.social_link || "",
    avatar_url: profile?.avatar_url || "", 
    gear_type: "Manual",
    specialization: "",
    default_location_id: ""
  })

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  const handleAvatarUploaded = (newFileName: string) => {
    setFormData(prev => ({ ...prev, avatar_url: newFileName }))
    toast.success("Identity image captured")
  }

  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    if (formData.avatar_url) {
      if (formData.avatar_url.startsWith('http')) {
        setPreviewUrl(formData.avatar_url)
      } else {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(`avatars/${formData.avatar_url}`)
        setPreviewUrl(data.publicUrl)
      }
    } else {
      setPreviewUrl("")
    }
  }, [formData.avatar_url])

  // --- 1. Avatar Resolution Logic ---
  useEffect(() => {
    async function resolveAvatar() {
      const rawAvatar = profile?.avatar_url
      if (!rawAvatar) {
        setAvatarPreview(null)
        return
      }

      if (rawAvatar.startsWith('http')) {
        setAvatarPreview(rawAvatar)
      } else {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(`avatars/${rawAvatar}`)
        setAvatarPreview(data.publicUrl)
      }
    }
    resolveAvatar()
  }, [profile?.avatar_url])


  

  useEffect(() => {
    if (!authLoading && profile) {
      loadExtendedProfileData()
      fetchLocations()
    } else if (!authLoading && !profile) {
      setFetchingExtended(false)
    }
  }, [profile, authLoading])

  async function fetchLocations() {
    const { data } = await supabase.from('locations').select('*').eq('is_active', true)
    if (data) setLocations(data)
  }

  // --- 2. Avatar Upload & Delete Logic ---
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      if (profile.avatar_url && !profile.avatar_url.startsWith('http')) {
        await supabase.storage.from('avatars').remove([`avatars/${profile.avatar_url}`])
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', profile.id)

      if (updateError) throw updateError

      toast.success(t("avatar_success"))
      setTimeout(() => window.location.reload(), 500)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function deleteAvatar() {
    // Fixed confirm button text using translation
    if (!profile?.avatar_url || !confirm(t("delete_confirm"))) return
    
    setUploadingAvatar(true)
    try {
      if (!profile.avatar_url.startsWith('http')) {
        await supabase.storage.from('avatars').remove([`avatars/${profile.avatar_url}`])
      }

      await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
      
      toast.success(t("avatar_removed"))
      setTimeout(() => window.location.reload(), 500)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function loadExtendedProfileData() {
    if (!profile) return
    setFetchingExtended(true)
    try {
      let initialData = {
        //full_name: profile.full_name || "",
        first_name: profile.first_name || "",
        middle_name: profile.middle_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        social_link: profile.social_link || "",
        avatar_url: profile?.avatar_url || "", 
        gear_type: "Manual",
        specialization: "",
        default_location_id: ""
      }

      if (role === 'rider') {
        const { data } = await supabase.from('clients').select('*').eq('profile_id', profile.id).maybeSingle()
        if (data) {
          initialData = { 
            ...initialData, 
            // phone: data.phone || profile.phone || "",
            // address: profile.address || "",
            // social_link: profile.social_link || "",
            gear_type: data.gear_type || "Manual"
          }
        }
      }
      else if (role === 'instructor' || role === 'admin') {
        const { data } = await supabase.from('instructors').select('*').eq('profile_id', profile.id).maybeSingle()
        if (data) {
          initialData = { 
            ...initialData, 
            specialization: data.specialization || "",
            default_location_id: data.default_location_id || ""
          }
        }
      }
      setFormData(initialData)
    } finally {
      setFetchingExtended(false)
    }
  }

  async function handleUpdate() {
    if (!profile) return
    setUpdating(true)
    try {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ first_name: formData.first_name,
                  middle_name: formData.middle_name,
                  last_name: formData.last_name,
                  phone: formData.phone,
                  address: formData.address,
                  social_link: formData.social_link,
                  })
        .eq('id', profile.id)
      if (pErr) throw pErr

      if (role === 'rider') {
        const { error: cErr } = await supabase.from('clients').update({

          gear_type: formData.gear_type

        }).eq('profile_id', profile.id)
        if (cErr) throw cErr
      } 
      else if (role === 'instructor' || role === 'admin') {
        const { error: iErr } = await supabase.from('instructors').update({

          specialization: formData.specialization,
          default_location_id: formData.default_location_id || null

        }).eq('profile_id', profile.id)
        if (iErr) throw iErr
      }

      toast.success(t("sync_success"))
      await refreshProfile();
      //setTimeout(() => window.location.reload(), 400)

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUpdating(false)
    }
  }

  if (authLoading || fetchingExtended) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={42} />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 pb-32">
      
      {/* --- HEADER --- */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-2xl">
        <div className="relative group shrink-0">
          {/* <div className="w-48 h-48 md:w-48 md:h-48 rounded-[2.5rem] bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-primary">{formData.first_name?.charAt(0)}</span>
            )}

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}
          </div> */}

              <div 
                onClick={() => setIsAvatarModalOpen(true)} 
                className="relative group shrink-0 cursor-pointer"
              >
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-black border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden group-hover:border-primary transition-all">
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Pilot" />
                  ) : (
                    <Camera className="text-zinc-700 group-hover:text-primary transition-colors" size={40} />
                  )}
                </div>
                
                {/* Кнопка редагування поверх фото */}
                <div className="absolute -bottom-2 -right-2 bg-primary p-3 rounded-2xl text-black shadow-xl group-hover:scale-110 transition-transform">
                  <Upload size={18} />
                </div>
              </div>


          <div className="absolute -bottom-2 -right-2 flex gap-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-primary text-black rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"
            >
              <Camera size={18} />
            </button>
            {avatarPreview && (
              <button 
                onClick={deleteAvatar}
                className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
        </div>
        
        {/* <div className="text-center md:text-left space-y-3 z-10">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">
            {formData.full_name} <span className="text-primary">{formData.last_name}</span>
          </h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
             <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t("account_type", { role: profile.role })}
             </span>
             <span className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
               ID: {profile.id.slice(0, 8)}
             </span>
          </div>
        </div> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- COLUMN 1: PERSONAL --- */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-8 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary flex items-center gap-3">
            <UserIcon size={16} /> {t("basic_identity")}
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("first_name")}</label>
                <input 
                  value={formData.first_name || ""}
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("last_name")}</label>
                <input 
                  value={formData.last_name || ""}
                  onChange={e => setFormData({...formData, last_name: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("email_label")}</label>
              <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl px-5 py-4 text-slate-500 flex items-center gap-3 cursor-not-allowed">
                <Mail size={16} /> 
                {(profile as any).email || user?.email || t("no_email")} 
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("phone_label")}</label>
              <div className="relative">
                <Phone size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  value={formData.phone || ""}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:border-primary outline-none transition-all font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- COLUMN 2: ROLE DATA --- */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-8 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary flex items-center gap-3">
            <Shield size={16} /> {t("role_specs")}
          </h3>

          <div className="space-y-6">
            {role === 'rider' ? (
              <>
                {/* <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("default_gear")}</label>
                  <select 
                    value={formData.gear_type}
                    onChange={e => setFormData({...formData, gear_type: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none appearance-none cursor-pointer"
                  >
                    <option value="Manual" className="bg-black">{t("manual")}</option>
                    <option value="Auto" className="bg-black">{t("auto")}</option>
                  </select>
                </div> */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("social_link")}</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      value={formData.social_link || ""}
                      onChange={e => setFormData({...formData, social_link: e.target.value})}
                      placeholder="https://..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("address")}</label>
                  <textarea 
                    value={formData.address || ""}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none min-h-[100px] resize-none text-sm font-medium"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("specialization")}</label>
                  <input 
                    value={formData.specialization || ""}
                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                    placeholder={t("specialization_placeholder")}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-3">{t("primary_location")}</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <select 
                      value={formData.default_location_id || ""}
                      onChange={e => setFormData({...formData, default_location_id: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:border-primary outline-none appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-black">{t("unassigned")}</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id} className="bg-black">{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      
      <AvatarModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUploadSuccess={handleAvatarUploaded}
      />

      {/* --- FOOTER ACTIONS --- */}
      <div className="flex justify-end pt-8 pb-safe-bottom-mobile">
        <button 
          onClick={handleUpdate}
          disabled={updating}
          className="w-full md:w-auto min-w-[260px] bg-primary text-black font-black uppercase py-5 px-10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {updating ? t("updating") : t("update_button")}
        </button>
      </div>
    </div>
  )
}