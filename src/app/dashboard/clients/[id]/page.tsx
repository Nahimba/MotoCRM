"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, Edit3, Phone, Mail, 
  MapPin, Calendar, CreditCard, Activity, Clock, Trash2
} from "lucide-react"
import Link from "next/link"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadClientData() {
      if (!id) return
      
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          accounts (
            id,
            course_packages (*),
            payments (*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error(error)
        router.push('/dashboard/clients')
      } else {
        setClient(data)
      }
      setLoading(false)
    }
    loadClientData()
  }, [id, router])

  if (loading) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-primary uppercase tracking-widest">Loading Rider Dossier...</div>
  if (!client) return <div className="h-screen flex items-center justify-center text-white font-black">RIDER NOT FOUND</div>

  const account = client.accounts?.[0]
  const activePackage = account?.course_packages?.find((p: any) => p.status === 'active')

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <Link href="/dashboard/clients" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Roster</span>
          </Link>
          <div>
            <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter leading-none">
              {client.name} <span className="text-primary">{client.last_name}</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">
              Rider ID: {id.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href={`/dashboard/clients/${id}/edit`}
            className="flex-1 md:flex-none bg-white/5 border border-white/10 p-4 px-6 rounded-2xl text-white hover:border-primary transition-all flex items-center justify-center gap-2"
          >
            <Edit3 size={18} /> <span className="text-xs font-black uppercase">Edit Profile</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: PERSONAL INTEL */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Personal Intel</h2>
            <div className="space-y-6">
              <InfoRow icon={<Phone size={14}/>} label="Phone" value={client.phone} />
              <InfoRow icon={<Mail size={14}/>} label="Email" value={client.email} />
              <InfoRow icon={<MapPin size={14}/>} label="Address" value={client.address} />
            </div>
            
            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-3">Transmission</p>
              <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${client.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                {client.gear_type}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRAINING & FINANCE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              label="Remaining Hours" 
              value={`${activePackage?.remaining_hours || 0}h`} 
              icon={<Clock className="text-primary" />} 
              sub={`of ${activePackage?.total_hours || 0}h total`}
            />
            <StatCard 
              label="Account Balance" 
              value={`${client.debt > 0 ? `-${client.debt}` : '0'} ₴`} 
              icon={<CreditCard className={client.debt > 0 ? "text-red-500" : "text-green-500"} />} 
              sub={client.debt > 0 ? "Outstanding Debt" : "Settled"}
            />
          </div>

          {/* ACTIVE PACKAGE SECTION */}
          <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Active Course</h3>
                <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">In Progress</span>
             </div>
             
             {activePackage ? (
                <div className="space-y-6">
                   <div className="flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-black text-white italic uppercase">{activePackage.package_name || 'Standard Training'}</p>
                        <p className="text-xs text-slate-500 font-bold">Contract Price: {activePackage.contract_price} ₴</p>
                      </div>
                      <p className="text-4xl font-black text-white italic">
                         {Math.round(((activePackage.total_hours - activePackage.remaining_hours) / activePackage.total_hours) * 100)}%
                      </p>
                   </div>
                   {/* Progress Bar */}
                   <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${((activePackage.total_hours - activePackage.remaining_hours) / activePackage.total_hours) * 100}%` }}
                      />
                   </div>
                </div>
             ) : (
                <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                   <p className="text-slate-600 font-black uppercase text-[10px]">No active course package found</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

// HELPER COMPONENTS
function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="p-3 bg-white/5 rounded-2xl text-slate-500 group-hover:text-primary transition-colors border border-white/5">{icon}</div>
      <div>
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white leading-tight">{value || 'Not Provided'}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, sub }: any) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-white/10 transition-all">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-4xl font-black text-white italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-bold text-slate-600 uppercase mt-2 tracking-widest">{sub}</p>
      </div>
      <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  )
}