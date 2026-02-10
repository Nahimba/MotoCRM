"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Loader2, User, Phone, Mail, Bike, MapPin, Edit3 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function RiderForm({ initialData, id }: { initialData?: any, id?: string }) {
  const t = useTranslations("Clients.form")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    last_name: initialData?.last_name || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    gear_type: initialData?.gear_type || "Manual",
    doc_status: initialData?.doc_status || "Pending",
    notes: initialData?.notes || "",
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        last_name: initialData.last_name || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        gear_type: initialData.gear_type || "Manual",
        doc_status: initialData.doc_status || "Pending",
        notes: initialData.notes || "",
      })
    }
  }, [initialData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (id) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            last_name: formData.last_name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            gear_type: formData.gear_type,
            doc_status: formData.doc_status,
            notes: formData.notes
          })
          .eq('id', id)
        
        if (error) throw error
        toast.success(t("success_update"))
      } else {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .insert([{ ...formData, is_active: true }])
          .select()
          .single()
        
        if (clientError) throw clientError

        const { error: accError } = await supabase
          .from('accounts')
          .insert([{
            client_id: client.id,
            account_label: `${formData.name}'s Main Account`,
            account_status: 'active'
          }])
        
        if (accError) throw accError
        toast.success(t("success_create"))
      }
      
      router.push('/staff/clients')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[10px] font-black uppercase tracking-widest">{t("abort")}</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter">
          {id ? t("modify_title") : t("recruit_title")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <User size={12} /> {t("first_name")}
                </label>
                {/* REMOVED 'uppercase' and changed placeholder to normal casing */}
                <input 
                  required 
                  placeholder="First Name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <User size={12} /> {t("last_name")}
                </label>
                {/* REMOVED 'uppercase' and changed placeholder to normal casing */}
                <input 
                  required 
                  placeholder="Last Name" 
                  value={formData.last_name} 
                  onChange={e => setFormData({...formData, last_name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all font-bold" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <Phone size={12} /> {t("phone")}
                </label>
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <Mail size={12} /> {t("email")}
                </label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none font-bold" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                <MapPin size={12} /> {t("address")}
              </label>
              {/* REMOVED 'uppercase' */}
              <input 
                placeholder="Residential Address"
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none font-bold" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                <Edit3 size={12} /> {t("notes")}
              </label>
              {/* REMOVED 'uppercase' */}
              <textarea 
                rows={3} 
                placeholder={t("notes_placeholder")} 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none font-bold resize-none" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-6 space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 ml-1">{t("transmission")}</label>
              <div className="grid grid-cols-2 gap-2">
                {['Manual', 'Auto'].map(type => (
                  <button key={type} type="button" onClick={() => setFormData({...formData, gear_type: type})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.gear_type === type ? 'bg-primary border-primary text-black' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button disabled={loading} className="w-full bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <Bike size={18} />}
              {id ? t("update_btn") : t("recruit_btn")}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}