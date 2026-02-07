"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Save, Loader2, User, Phone, MapPin, Tag, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export default function RiderForm({ initialData, id }: { initialData?: any, id?: string }) {
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
    lead_source: initialData?.lead_source || "Instagram",
    notes: initialData?.notes || "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (id) {
        // UPDATE Existing Client
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', id)
        if (error) throw error
        toast.success("Rider updated successfully")
      } else {
        // CREATE New Client + Their Financial Account
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([formData])
          .select()
          .single()

        if (clientError) throw clientError

        // Automatically create the linked Account record
        const { error: accError } = await supabase
          .from('accounts')
          .insert([{ 
            client_id: newClient.id, 
            account_label: `${newClient.name} ${newClient.last_name}` 
          }])
        
        if (accError) throw accError
        toast.success("New rider recruited!")
      }
      router.push('/dashboard/clients')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
          <ChevronLeft size={20} /> <span className="text-xs font-black uppercase tracking-widest">Back to Roster</span>
        </button>
        <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">
          {id ? 'Modify Commander' : 'Recruit New Rider'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Personal Data */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-white/5 rounded-3xl p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">First Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Last Name</label>
                <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Phone Number</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Notes / Special Requirements</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none h-32 resize-none" />
            </div>
          </div>
        </div>

        {/* Right Column: Status & Gear */}
        <div className="space-y-6">
          <div className="bg-card border border-white/5 rounded-3xl p-6 space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Transmission</label>
              <div className="grid grid-cols-2 gap-2">
                {['Manual', 'Auto'].map(type => (
                  <button key={type} type="button" onClick={() => setFormData({...formData, gear_type: type})} className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.gear_type === type ? 'bg-primary text-black' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Lead Source</label>
              <select value={formData.lead_source} onChange={e => setFormData({...formData, lead_source: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none text-xs">
                <option value="Instagram">Instagram</option>
                <option value="Referral">Referral</option>
                <option value="Google">Google Search</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Doc Status</label>
              <select value={formData.doc_status} onChange={e => setFormData({...formData, doc_status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none text-xs">
                <option value="Pending">🕒 Pending</option>
                <option value="Submitted">✅ Submitted</option>
                <option value="Rejected">❌ Rejected</option>
              </select>
            </div>

            <button disabled={loading} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,165,0,0.3)] transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {id ? 'Save Changes' : 'Confirm Recruitment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}