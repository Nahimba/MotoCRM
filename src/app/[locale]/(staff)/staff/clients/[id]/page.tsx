"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, Edit3, Phone, Mail, 
  MapPin, CreditCard, Clock, Bike, ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("Clients.details")
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
        router.push('/staff/clients')
      } else {
        setClient(data)
      }
      setLoading(false)
    }
    loadClientData()
  }, [id, router])

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
      <Bike size={48} className="text-primary animate-bounce" />
      <div className="font-black animate-pulse text-primary uppercase tracking-[0.5em] text-xs">{t("loading")}</div>
    </div>
  )
  
  if (!client) return <div className="h-screen flex items-center justify-center text-white font-black uppercase">{t("lost_signal")}</div>

  const account = client.accounts?.[0]
  const activePackage = account?.course_packages?.find((p: any) => p.status === 'active')
  
  const totalPaid = account?.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const contractPrice = activePackage?.contract_price || 0;
  const debt = contractPrice - totalPaid;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6">
        <div className="space-y-4">
          <Link href="/staff/clients" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-[10px] font-black uppercase tracking-widest">{t("return")}</span>
          </Link>
          <div>
            <h1 className="text-6xl font-black italic uppercase text-white tracking-tighter leading-[0.8]">
              {client.name} <span className="text-primary">{client.last_name}</span>
            </h1>
            <div className="flex items-center gap-3 mt-4">
               <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 UID: {id.slice(0, 8)}
               </span>
               <span className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                 <ShieldCheck size={14} /> {t("active_status")}
               </span>
            </div>
          </div>
        </div>

        <Link 
          href={`/staff/clients/${id}/edit`}
          className="bg-white text-black p-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          <Edit3 size={18} /> {t("modify")}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: CORE INTEL */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Bike size={120} />
            </div>
            
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-4">{t("core_intel")}</h2>
            <div className="space-y-6 relative z-10">
              <InfoRow icon={<Phone size={14}/>} label={t("comms")} value={client.phone} fallback={t("unspecified")} />
              <InfoRow icon={<Mail size={14}/>} label={t("network")} value={client.email} fallback={t("unspecified")} />
              <InfoRow icon={<MapPin size={14}/>} label={t("sector")} value={client.address} fallback={t("unspecified")} />
            </div>
            
            <div className="pt-4">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest">{t("transmission")}</p>
              <span className={`px-6 py-3 rounded-2xl text-xs font-black uppercase inline-block border ${client.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                {client.gear_type || 'Manual'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRAINING & FINANCE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              label={t("rem_time")} 
              value={`${activePackage?.remaining_hours || 0}H`} 
              icon={<Clock size={28} className="text-primary" />} 
              sub={t("deployment", { total: activePackage?.total_hours || 0 })}
            />
            <StatCard 
              label={t("fin_standing")} 
              value={`${debt > 0 ? `-${debt}` : '0'} ₴`} 
              icon={<CreditCard size={28} className={debt > 0 ? "text-red-500" : "text-green-500"} />} 
              sub={debt > 0 ? t("outstanding") : t("settled")}
            />
          </div>

          {/* ACTIVE PACKAGE SECTION */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">{t("active_module")}</h3>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t("live_session")}</span>
                </div>
              </div>
              
              {activePackage ? (
                <div className="space-y-8">
                   <div className="flex justify-between items-end">
                     <div>
                        <p className="text-4xl font-black text-white italic uppercase tracking-tighter">{activePackage.package_name || 'Standard Package'}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">{t("valuation")}: {activePackage.contract_price} ₴</p>
                     </div>
                     <div className="text-right">
                        <p className="text-5xl font-black text-white italic leading-none">
                           {Math.round(((activePackage.total_hours - activePackage.remaining_hours) / activePackage.total_hours) * 100)}%
                        </p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{t("completion")}</p>
                     </div>
                   </div>

                   <div className="h-6 bg-white/5 rounded-2xl overflow-hidden border border-white/5 p-1">
                      <div 
                        className="h-full bg-primary rounded-xl transition-all duration-1000 shadow-[0_0_20px_rgba(255,165,0,0.4)]" 
                        style={{ width: `${((activePackage.total_hours - activePackage.remaining_hours) / activePackage.total_hours) * 100}%` }}
                      />
                   </div>
                </div>
              ) : (
                <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                   <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-xs">{t("no_deployment")}</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, fallback }: any) {
  return (
    <div className="flex items-center gap-5 group">
      <div className="p-4 bg-white/5 rounded-[1.25rem] text-slate-500 group-hover:text-primary transition-all border border-white/5 group-hover:border-primary/20">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-sm font-black text-white uppercase tracking-tight">{value || fallback}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, sub }: any) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 flex items-center justify-between group hover:border-primary/20 transition-all">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</p>
        <h4 className="text-5xl font-black text-white italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-black text-slate-600 uppercase mt-3 tracking-widest">{sub}</p>
      </div>
      <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 group-hover:bg-primary/5 group-hover:scale-105 transition-all">
        {icon}
      </div>
    </div>
  )
}