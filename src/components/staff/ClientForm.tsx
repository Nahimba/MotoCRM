"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, Loader2, User, Phone, Mail, Bike, 
  MapPin, Edit3, Tag, Target, Calendar, CheckCircle2,
  Fingerprint
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function RiderForm({ initialData, id }: { initialData?: any, id?: string }) {
  const t = useTranslations("Clients.form")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: initialData?.profiles?.first_name || "",
    last_name: initialData?.profiles?.last_name || "",
    phone: initialData?.profiles?.phone || "",
    email: initialData?.profiles?.email || "",
    address: initialData?.profiles?.address || "",
    gear_type: initialData?.gear_type || "Manual",
    doc_status: initialData?.doc_status || "Pending",
    lead_source: initialData?.lead_source || "",
    notes: initialData?.notes || "",
    is_graduated: initialData?.is_graduated || false,
    doc_submission_date: initialData?.doc_submission_date || "",
    ready_date_est: initialData?.ready_date_est || "",
    tags: initialData?.tags?.join(", ") || "",
  })

  // SIMPLIFIED UI: Visible borders, standard padding, no complex focus effects
  const inputClass = "w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors placeholder:text-zinc-600 text-sm font-medium"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const tagsArray = formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []

    try {
      if (id) {
        const { error: pError } = await supabase.from('profiles').update({
          first_name: formData.first_name, last_name: formData.last_name,
          phone: formData.phone, email: formData.email, address: formData.address,
        }).eq('id', initialData.profile_id)
        if (pError) throw pError

        const { error: cError } = await supabase.from('clients').update({
          gear_type: formData.gear_type, lead_source: formData.lead_source, 
          notes: formData.notes, is_graduated: formData.is_graduated, 
          tags: tagsArray, doc_submission_date: formData.doc_submission_date || null,
          ready_date_est: formData.ready_date_est || null,
        }).eq('id', id)
        if (cError) throw cError
        
        toast.success(t("success_update"))
      } else {
        const newProfileId = crypto.randomUUID()
        const { error: pError } = await supabase.from('profiles').insert([{
          id: newProfileId, first_name: formData.first_name, last_name: formData.last_name,
          phone: formData.phone, email: formData.email, address: formData.address, role: 'rider'
        }])
        if (pError) throw pError

        const { data: client, error: cError } = await supabase.from('clients').insert([{
          profile_id: newProfileId, gear_type: formData.gear_type, tags: tagsArray,
          notes: formData.notes, lead_source: formData.lead_source,
          doc_submission_date: formData.doc_submission_date || null,
          ready_date_est: formData.ready_date_est || null,
        }]).select().single()
        if (cError) throw cError

        if (client) await supabase.from('accounts').insert([{ client_id: client.id }])
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={18} /> 
          <span className="text-xs font-bold uppercase tracking-wider">Back</span>
        </button>
        <h1 className="text-2xl font-black uppercase text-white tracking-tight">
          {id ? "Edit Rider" : "New Recruit"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* MAIN BOX */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PERSONAL DATA */}
            <div className="space-y-6">
              <h2 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Fingerprint size={14}/> Identity
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name"><input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className={inputClass} /></Field>
                <Field label="Last Name"><input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className={inputClass} /></Field>
              </div>
              <Field label="Phone"><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+00..." /></Field>
              <Field label="Email"><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} /></Field>
              <Field label="Address"><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} /></Field>
            </div>

            {/* STATUS & SOURCE */}
            <div className="space-y-6">
              <h2 className="text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Target size={14}/> Logistics
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <Field label="Transmission">
                  <select value={formData.gear_type} onChange={e => setFormData({...formData, gear_type: e.target.value})} className={inputClass}>
                    <option value="Manual">Manual</option>
                    <option value="Auto">Auto</option>
                  </select>
                </Field>
                <Field label="Lead Source"><input value={formData.lead_source} onChange={e => setFormData({...formData, lead_source: e.target.value})} className={inputClass} /></Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Doc Date"><input type="date" value={formData.doc_submission_date} onChange={e => setFormData({...formData, doc_submission_date: e.target.value})} className={inputClass} /></Field>
                <Field label="Ready Date"><input type="date" value={formData.ready_date_est} onChange={e => setFormData({...formData, ready_date_est: e.target.value})} className={inputClass} /></Field>
              </div>

              <Field label="Tags"><input placeholder="VIP, Weekend..." value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className={inputClass} /></Field>
            </div>

          </div>

          {/* NOTES - FULL WIDTH */}
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <Field label="Internal Notes">
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={inputClass} />
            </Field>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-col md:flex-row gap-4">
          <button 
            type="button" 
            onClick={() => setFormData({...formData, is_graduated: !formData.is_graduated})}
            className={`flex-1 flex items-center justify-between p-4 rounded-xl border-2 transition-all ${formData.is_graduated ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-zinc-800 text-zinc-500'}`}
          >
            <span className="text-xs font-bold uppercase tracking-widest">Graduation Status</span>
            {formData.is_graduated ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 border-2 border-current rounded-full" />}
          </button>

          <button disabled={loading} className="w-full bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <Bike size={18} />}
            {id ? "Save Changes" : "Recruit Rider"}
          </button>
        </div>

      </form>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-widest">
        {label}
      </label>
      {children}
    </div>
  )
}