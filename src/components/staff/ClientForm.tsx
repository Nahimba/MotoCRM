"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, Loader2, Bike, 
  Target, Fingerprint, 
  Power, Upload, Camera, Trash2, GraduationCap, ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { LEAD_SOURCES, STUDENT_STAGES, type LeadSource, type StudentStage } from "@/constants/constants"

import { AvatarModal } from "@/components/avatar/AvatarModal"

export default function RiderForm({ initialData, id }: { initialData?: any, id?: string }) {
  const t = useTranslations("Clients")
  const tConst = useTranslations("Constants")
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isSaved, setIsSaved] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")


  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  const handleAvatarUploaded = (newFileName: string) => {
    setFormData(prev => ({ ...prev, avatar_url: newFileName }))
    toast.success("Identity image captured")
  }
  
  const [formData, setFormData] = useState({
    first_name: initialData?.profiles?.first_name || "",
    middle_name: initialData?.profiles?.middle_name || "",
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
    training_stage: (initialData?.training_stage || "lead") as StudentStage,
    is_active: initialData?.is_active ?? true,
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


  const formatFlexiblePhone = (value: string) => {
    if (!value) return "";
    
    // Preserve the plus if it's at the start
    const hasPlus = value.startsWith("+");
    const digits = value.replace(/\D/g, "");
    
    let formatted = digits;
  
    if (digits.length > 0) {
      if (digits.length <= 2) {
        formatted = digits;
      } else if (digits.length <= 5) {
        formatted = `${digits.slice(0, 2)} (${digits.slice(2)}`;
      } else if (digits.length <= 8) {
        formatted = `${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5)}`;
      } else if (digits.length <= 10) {
        formatted = `${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8)}`;
      } else {
        formatted = `${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
      }
    }
  
    return hasPlus ? `+${formatted}` : formatted;
  };


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (uploading) return 

    // --- VALIDATION BLOCK ---
    const digitCount = formData.phone.replace(/\D/g, "").length;
    if (formData.phone && (digitCount < 7 || digitCount > 15)) {
      toast.error("Невірний номер телефону");
      return; // Stop execution early
    }

    // 1. Define the Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // 2. Validate inside handleSubmit
    if (formData.email && !emailRegex.test(formData.email)) {
      toast.error("Невірний email адреса (або залиште поле пустим)");
      setLoading(false); // Only if you've already set loading to true
      return;
    }
    // --- END VALIDATION BLOCK ---

    setLoading(true)
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error("Unauthorized")
  
      const profilePayload = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        phone: formData.phone || null, 
        email: formData.email || null, 
        address: formData.address,
        avatar_url: formData.avatar_url, 
        social_link: formData.social_link,
        role: 'rider'
      }

      const clientPayload = {
        gear_type: formData.gear_type, 
        lead_source: formData.lead_source || null, 
        notes: formData.notes, 
        training_stage: formData.training_stage,
        is_active: formData.is_active,
      }

      let targetClientId = id;
  
      if (id) {
        // Update logic remains the same
        const { error: pError } = await supabase.from('profiles').update(profilePayload).eq('id', initialData.profile_id)
        if (pError) throw pError
  
        const { error: cError } = await supabase.from('clients').update(clientPayload).eq('id', id)
        if (cError) throw cError
      } else {
        // NEW FLEXIBLE CREATION: No Edge Function needed for CRM-only riders
        // 1. Create Profile (Postgres generates the UUID automatically)
        const { data: newProfile, error: pError } = await supabase
          .from('profiles')
          .insert([profilePayload])
          .select()
          .single()
        
        if (pError) throw pError
  
        // 2. Create Client linked to that Profile
        const { data: newClient, error: cError } = await supabase
          .from('clients')
          .insert([{
              profile_id: newProfile.id,
              created_by_profile_id: currentUser.id,
              ...clientPayload
          }])
          .select()
          .single()
  
        if (cError) throw cError

        targetClientId = newClient.id; // Capture the new ID for redirect
  
        // 3. Create Account
        const { error: aError } = await supabase.from('accounts').insert([{
            client_id: newClient.id,
            created_by_profile_id: currentUser.id,
            account_status: 'active'
        }])
        if (aError) throw aError
      }
      
      setIsSaved(true)
      toast.success(id ? t("form.success_update") : t("form.success_create"))
      //router.push('/staff/clients')
      router.push(`/staff/clients/${targetClientId}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
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
          
          <div className="flex flex-col md:flex-row items-center gap-2 mb-4 pb-2 border-b border-zinc-800/50">
            <div className="relative group shrink-0">


              {/* <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-black border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden group-hover:border-primary transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)]">
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
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-1">Фото</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h2 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Fingerprint size={14}/> {t("details.core_intel")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("form.first_name")}><input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className={inputClass} /></Field>
                <Field label="По батькові"><input value={formData.middle_name} onChange={e => setFormData({...formData, middle_name: e.target.value})} className={inputClass} /></Field>
                <Field label={t("form.last_name")}><input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className={inputClass} /></Field>
              </div>
              
              {/* <Field label={t("form.phone")}><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+380..." /></Field> */}
              <Field label={t("form.phone")}>
                <input 
                  type="tel"
                  value={formatFlexiblePhone(formData.phone)} 
                  onChange={e => {
                    const input = e.target.value;
                    // Allow only digits and a leading plus
                    const rawValue = input.startsWith('+') 
                      ? '+' + input.replace(/\D/g, "") 
                      : input.replace(/\D/g, "");
                    
                    // Limit total digits to 15 (standard international max)
                    if (rawValue.length <= 16) { 
                      setFormData({...formData, phone: rawValue});
                    }
                  }} 
                  className={inputClass} 
                  placeholder="+38 (0XX) XXX XX XX" 
                />
              </Field>

              <Field label={t("form.email")}><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} /></Field>
              <Field label={t("form.address")}><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} /></Field>
              
            </div>

            <div className="space-y-6">
              <h2 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Target size={14}/> {"Додаткові дані"}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("form.transmission")}>
                  <select value={formData.gear_type} onChange={e => setFormData({...formData, gear_type: e.target.value})} className={inputClass}>
                    <option value="Manual">{tConst ("gear_type.Manual")}</option>
                    <option value="Auto">{tConst ("gear_type.Auto")}</option>
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
              <Field label="Сторінка в соцмережах"><input value={formData.social_link} onChange={e => setFormData({...formData, social_link: e.target.value})} className={inputClass} placeholder="Instagram/Facebook URL" /></Field>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800">
            <Field label={t("form.notes")}>
              <textarea rows={3} placeholder={t("form.notes_placeholder")} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            type="button" 
            onClick={() => setFormData({...formData, is_active: !formData.is_active})} 
            className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${formData.is_active ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-800 text-zinc-500'}`}
          >
            <span className="text-xs font-black uppercase tracking-widest">{formData.is_active ? "Активний"  : "Неактивний"} </span>
            <Power size={20} />
          </button>

          <div className="relative group">
            <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all border-zinc-800 bg-black focus-within:border-primary`}>
              <GraduationCap size={20} className="text-primary shrink-0" />
              <div className="flex-1">
                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 leading-none">
                  {t("form.training_stage")}
                </label>
                <div className="relative">
                  <select 
                    value={formData.training_stage} 
                    onChange={e => setFormData({...formData, training_stage: e.target.value as StudentStage})} 
                    className="w-full bg-transparent text-white outline-none text-[13px] font-black uppercase italic tracking-wider cursor-pointer appearance-none"
                  >
                    {STUDENT_STAGES.map((stage) => (
                      <option key={stage} value={stage} className="bg-zinc-900 text-white">
                        {tConst(`student_stages.${stage}`)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          disabled={loading || uploading} 
          className="w-full bg-primary text-black font-black py-6 rounded-[2rem] uppercase tracking-[0.3em] text-xs hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_20px_50px_rgba(var(--primary-rgb),0.2)]"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Bike size={20} />}
          {id ? t("form.update_btn") : t("form.recruit_btn")}
        </button>
      </form>

      <AvatarModal 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUploadSuccess={handleAvatarUploaded}
      />

    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-[0.2em]">{label}</label>
      {children}
    </div>
  )
}





  // async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault()
  //   if (uploading) return 
  //   setLoading(true)
    
  //   try {
  //     const profilePayload = {
  //       first_name: formData.first_name, 
  //       last_name: formData.last_name,
  //       phone: formData.phone, 
  //       email: formData.email, 
  //       address: formData.address,
  //       avatar_url: formData.avatar_url, 
  //       social_link: formData.social_link,
  //     }
  
  //     const clientPayload = {
  //       gear_type: formData.gear_type, 
  //       lead_source: formData.lead_source || null, 
  //       notes: formData.notes, 
  //       training_stage: formData.training_stage,
  //       is_active: formData.is_active,
  //     }
  
  //     if (id) {
  //       // Direct update for existing records
  //       const { error: pError } = await supabase.from('profiles').update(profilePayload).eq('id', initialData.profile_id)
  //       if (pError) throw pError
  
  //       const { error: cError } = await supabase.from('clients').update(clientPayload).eq('id', id)
  //       if (cError) throw cError
  //     } else {
  //       // Atomic creation via Edge Function
  //       const { data: { session } } = await supabase.auth.getSession()
        
  //       if (!session?.access_token) {
  //         throw new Error("No active session. Please log in.")
  //       }
  
  //       const { error } = await supabase.functions.invoke('create-user', {
  //         body: { 
  //           profileData: profilePayload,
  //           clientData: clientPayload,
  //           role_to_create: 'rider' 
  //         },
  //         headers: {
  //           // Force the exact format: "Bearer eyJ..."
  //           'Authorization': `Bearer ${session.access_token}`
  //         }
  //       })
        
  //       if (error) {
  //         // Log the specific error from the Edge Function
  //         console.error("Function invocation error:", error)
  //         throw error
  //       }
  //     }
      
  //     setIsSaved(true)
  //     toast.success(id ? t("form.success_update") : t("form.success_create"))
  //     router.push('/staff/clients')
  //     router.refresh()
  //   } catch (error: any) {
  //     toast.error(error.message || "An unexpected error occurred")
  //   } finally {
  //     setLoading(false)
  //   }
  // }










  // async function handleSubmit(e: React.FormEvent) {
  //   e.preventDefault()
  //   if (uploading) return 
  //   setLoading(true)
    
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser()
  //     if (!user) throw new Error("Unauthorized")

  //     const profilePayload = {
  //       first_name: formData.first_name, 
  //       last_name: formData.last_name,
  //       phone: formData.phone, 
  //       email: formData.email, 
  //       address: formData.address,
  //       avatar_url: formData.avatar_url, 
  //       social_link: formData.social_link,
  //     }

  //     const clientPayload = {
  //       gear_type: formData.gear_type, 
  //       lead_source: formData.lead_source || null, 
  //       notes: formData.notes, 
  //       training_stage: formData.training_stage,
  //       is_active: formData.is_active,
  //     }

  //     if (id) {
  //       const { error: pError } = await supabase.from('profiles').update(profilePayload).eq('id', initialData.profile_id)
  //       if (pError) throw pError

  //       const { error: cError } = await supabase.from('clients').update(clientPayload).eq('id', id)
  //       if (cError) throw cError
  //     } else {
  //       const newProfileId = crypto.randomUUID()
        
  //       const { error: pError } = await supabase.from('profiles').insert([{
  //           id: newProfileId, 
  //           ...profilePayload,
  //           role: 'rider'
  //       }])
  //       if (pError) throw pError

  //       const { data: clientData, error: cError } = await supabase.from('clients').insert([{
  //           profile_id: newProfileId,
  //           created_by_profile_id: user.id,
  //           ...clientPayload
  //       }]).select().single()
  //       if (cError) throw cError

  //       const { error: aError } = await supabase.from('accounts').insert([{
  //           client_id: clientData.id,
  //           created_by_profile_id: user.id,
  //           account_status: 'active'
  //       }])
  //       if (aError) throw aError
  //     }
      
  //     setIsSaved(true)
  //     toast.success(id ? t("form.success_update") : t("form.success_create"))
  //     router.push('/staff/clients')
  //     router.refresh()
  //   } catch (error: any) {
  //     toast.error(error.message)
  //   } finally {
  //     setLoading(false)
  //   }
  // }