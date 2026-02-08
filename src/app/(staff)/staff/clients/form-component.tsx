"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Loader2, User, Phone, Mail, Bike, MapPin } from "lucide-react"
import { toast } from "sonner"

export default function RiderForm({ initialData, id }: { initialData?: any, id?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Note: initialData now comes from the 'clients' table which includes the join
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (id) {
        // 1. UPDATE Existing Rider in 'clients' table
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
        toast.success("Rider dossier updated")
      } else {
        // 2. CREATE New Rider
        // First, we create the account to get an account_id (if your schema requires it)
        // For now, assuming you insert directly into 'clients' as per your previous logic
        const { error: insertError } = await supabase
          .from('clients')
          .insert([{ 
            name: formData.name,
            last_name: formData.last_name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            gear_type: formData.gear_type,
            is_active: true
          }])
        
        if (insertError) throw insertError
        toast.success("New rider recruited to the squad!")
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[10px] font-black uppercase tracking-widest">Abort Mission</span>
        </button>
        <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter">
          {id ? 'Modify Dossier' : 'Recruit Rider'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Core Data */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <User size={12} /> First Name
                </label>
                <input 
                  required 
                  placeholder="JOHN"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all font-bold uppercase" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <User size={12} /> Last Name
                </label>
                <input 
                  required 
                  placeholder="DOE"
                  value={formData.last_name} 
                  onChange={e => setFormData({...formData, last_name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all font-bold uppercase" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <Phone size={12} /> Phone
                </label>
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <Mail size={12} /> Email
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
                  <MapPin size={12} /> Sector (Address)
                </label>
                <input 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none font-bold" 
                />
              </div>
          </div>
        </div>

        {/* Right Column: Spec & Action */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-6 space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 ml-1">Transmission Spec</label>
              <div className="grid grid-cols-2 gap-2">
                {['Manual', 'Auto'].map(type => (
                  <button 
                    key={type} 
                    type="button" 
                    onClick={() => setFormData({...formData, gear_type: type})} 
                    className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      formData.gear_type === type 
                        ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(255,165,0,0.2)]' 
                        : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-3 ml-1 tracking-[0.2em]">
                Document Status
              </label>
              <div className="flex flex-col gap-2">
                {['Pending', 'Submitted', 'Verified'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, doc_status: status })}
                    className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all border text-left flex justify-between items-center ${
                      formData.doc_status === status
                        ? 'bg-white/10 border-primary text-primary shadow-[0_0_15px_rgba(255,165,0,0.1)]'
                        : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {status}
                    {formData.doc_status === status && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-white transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Bike size={18} />}
              {id ? 'Commit Changes' : 'Confirm Recruit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}