"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, Loader2, Bike, 
  Target, Fingerprint, CheckCircle2,
  Power, Upload, Camera, Trash2
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { LEAD_SOURCES, type LeadSource } from "@/constants/constants"

export default function RiderForm({ initialData, id }: { initialData?: any, id?: string }) {
  const t = useTranslations("Clients")
  const tConst = useTranslations("Constants")
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isSaved, setIsSaved] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  
  const [formData, setFormData] = useState({
    first_name: initialData?.profiles?.first_name || "",
    last_name: initialData?.profiles?.last_name || "",
    phone: initialData?.profiles?.phone || "",
    email: initialData?.profiles?.email || "",
    address: initialData?.profiles?.address || "",
    avatar_url: initialData?.profiles?.avatar_url || "", 
    social_link: initialData?.profiles?.social_link || "",
    gear_type: initialData?.gear_type || "Manual",
    lead_source: (
      initialData?.lead_source && LEAD_SOURCES.includes(initialData.lead_source as LeadSource)
        ? (initialData.lead_source as LeadSource)
        : ""
    ) as LeadSource | "",
    notes: initialData?.notes || "",
    is_graduated: initialData?.is_graduated || false,
    is_active: initialData?.is_active ?? true,
    tags: initialData?.tags?.join(", ") || "",
  })

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

  const cleanupOrphanImage = async (filename: string) => {
    if (isSaved || !filename || filename === initialData?.profiles?.avatar_url) return
    await supabase.storage.from('avatars').remove([`avatars/${filename}`])
  }

  const handleAbort = async () => {
    if (formData.avatar_url !== initialData?.profiles?.avatar_url) {
      await cleanupOrphanImage(formData.avatar_url)
    }
    router.back()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      if (formData.avatar_url && formData.avatar_url !== initialData?.profiles?.avatar_url) {
        await cleanupOrphanImage(formData.avatar_url)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError
      setFormData(prev => ({ ...prev, avatar_url: fileName }))
      toast.success("Identity image captured")
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Are you sure you want to delete this Visual ID?")) return
    try {
      setUploading(true)
      const fileName = formData.avatar_url
      if (fileName) {
        await supabase.storage.from('avatars').remove([`avatars/${fileName}`])
      }
      if (id) {
        await supabase.from('profiles').update({ avatar_url: null }).eq('id', initialData.profile_id)
      }
      setFormData(prev => ({ ...prev, avatar_url: "" }))
      toast.success("Visual ID wiped")
    } catch (error: any) {
      toast.error("Wipe failed: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploading) return 
    setLoading(true)
    
    const tagsArray = formData.tags 
      ? formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) 
      : []

    try {
      // 1. Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      const profilePayload = {
        first_name: formData.first_name, 
        last_name: formData.last_name,
        phone: formData.phone, 
        email: formData.email, 
        address: formData.address,
        avatar_url: formData.avatar_url, 
        social_link: formData.social_link,
      }

      const clientPayload = {
        gear_type: formData.gear_type, 
        lead_source: formData.lead_source || null, 
        notes: formData.notes, 
        is_graduated: formData.is_graduated,
        is_active: formData.is_active, 
        tags: tagsArray,
      }

      if (id) {
        // UPDATE
        const { error: pError } = await supabase.from('profiles').update(profilePayload).eq('id', initialData.profile_id)
        if (pError) throw pError

        const { error: cError } = await supabase.from('clients').update(clientPayload).eq('id', id)
        if (cError) throw cError
      } else {
        // CREATE CHAIN
        const newProfileId = crypto.randomUUID()
        
        // A. Insert Profile
        const { error: pError } = await supabase.from('profiles').insert([{
            id: newProfileId, 
            ...profilePayload,
            role: 'rider'
        }])
        if (pError) throw pError

        // B. Insert Client
        const { data: clientData, error: cError } = await supabase.from('clients').insert([{
            profile_id: newProfileId,
            created_by_profile_id: user.id, // Audit trail
            ...clientPayload
        }]).select().single()
        if (cError) throw cError

        // C. Insert Account
        const { error: aError } = await supabase.from('accounts').insert([{
            client_id: clientData.id,
            created_by_profile_id: user.id, // Audit trail
            account_status: 'active'
        }])
        if (aError) throw aError
      }
      
      setIsSaved(true)
      toast.success(id ? t("form.success_update") : t("form.success_create"))
      router.push('/staff/clients')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors placeholder:text-zinc-600 text-sm font-medium"

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button type="button" onClick={handleAbort} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={18} /> 
          <span className="text-xs font-bold uppercase tracking-wider">{t("form.abort")}</span>
        </button>
        <h1 className="text-1xl font-black uppercase text-white tracking-tight">
          {id ? t("form.modify_title") : t("form.recruit_title")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8">
          
          <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-10 border-b border-zinc-800/50">
            <div className="relative group shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-black border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden group-hover:border-primary transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Pilot" />
                ) : (
                  <Camera className="text-zinc-700 group-hover:text-primary transition-colors" size={40} />
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                )}
              </div>
              
              <div className="absolute -bottom-2 -right-2 flex gap-2">
                {formData.avatar_url ? (
                  <button type="button" onClick={handleDeleteAvatar} className="bg-red-500 p-3 rounded-2xl text-white hover:bg-red-600 hover:scale-110 transition-all shadow-xl">
                    <Trash2 size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-primary p-3 rounded-2xl text-black hover:bg-white hover:scale-110 transition-all shadow-xl">
                    <Upload size={18} />
                  </button>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>

            <div className="text-center md:text-left">
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-1">Visual ID</p>
              <h3 className="text-white text-xl font-black uppercase italic">Identity Capture</h3>
              <p className="text-zinc-500 text-xs mt-2 max-w-[240px] leading-relaxed">
                {formData.avatar_url ? "Visual identification confirmed. Wipe record to reset." : "Upload a tactical headshot for the pilot roster."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h2 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Fingerprint size={14}/> {t("details.core_intel")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("form.first_name")}><input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className={inputClass} /></Field>
                <Field label={t("form.last_name")}><input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className={inputClass} /></Field>
              </div>
              <Field label={t("form.phone")}><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+380..." /></Field>
              <Field label={t("form.email")}><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} /></Field>
              <Field label="Social Link"><input value={formData.social_link} onChange={e => setFormData({...formData, social_link: e.target.value})} className={inputClass} placeholder="Instagram/Facebook URL" /></Field>
            </div>

            <div className="space-y-6">
              <h2 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Target size={14}/> {t("details.transmission")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("form.transmission")}>
                  <select value={formData.gear_type} onChange={e => setFormData({...formData, gear_type: e.target.value})} className={inputClass}>
                    <option value="Manual">Manual</option>
                    <option value="Auto">Auto</option>
                  </select>
                </Field>
                <Field label={t("form.lead_source")}>
                  <select value={formData.lead_source} onChange={e => setFormData({...formData, lead_source: e.target.value as LeadSource})} className={inputClass}>
                    <option value="" disabled>{t("form.select_source")}</option>
                    {LEAD_SOURCES.map((source) => (
                      <option key={source} value={source}>{tConst(`lead_sources.${source}`)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t("form.tags")}><input placeholder={t("form.tags_placeholder")} value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className={inputClass} /></Field>
              <Field label={t("form.address")}><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} /></Field>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800">
            <Field label={t("form.notes")}>
              <textarea rows={3} placeholder={t("form.notes_placeholder")} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button type="button" onClick={() => setFormData({...formData, is_active: !formData.is_active})} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${formData.is_active ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-800 text-zinc-500'}`}>
            <span className="text-xs font-bold uppercase tracking-widest">Active Status</span>
            <Power size={20} />
          </button>

          <button type="button" onClick={() => setFormData({...formData, is_graduated: !formData.is_graduated})} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${formData.is_graduated ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-zinc-800 text-zinc-500'}`}>
            <span className="text-xs font-bold uppercase tracking-widest">{t("form.graduation_status")}</span>
            <CheckCircle2 size={20} />
          </button>
        </div>

        <button disabled={loading || uploading} className="w-full bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <Bike size={18} />}
          {id ? t("form.update_btn") : t("form.recruit_btn")}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">{label}</label>
      {children}
    </div>
  )
}