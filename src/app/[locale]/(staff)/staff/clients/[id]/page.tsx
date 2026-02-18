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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadClientData() {
      if (!id) return
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles:profile_id (*),
          accounts (
            id,
            course_packages (*),
            payments (*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error("Fetch error:", error)
        router.push('/staff/clients')
      } else {
        setClient(data)
        
        // --- AVATAR URL RESOLUTION ---
        const rawAvatar = data.profiles?.avatar_url
        if (rawAvatar) {
          if (rawAvatar.startsWith('http')) {
            // Legacy support for full URLs
            setAvatarPreview(rawAvatar)
          } else {
            // New logic: generate public URL from filename
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(`avatars/${rawAvatar}`)
            setAvatarPreview(urlData.publicUrl)
          }
        }
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
  
  const profile = client?.profiles
  const account = client?.accounts?.[0]
  const activePackage = account?.course_packages?.find((p: any) => p.status === 'active')
  const totalPaid = account?.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const contractPrice = activePackage?.contract_price || 0
  const debt = contractPrice - totalPaid
  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-6">
      
      {/* --- BREADCRUMB --- */}
      <Link href="/staff/clients" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group w-fit">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        <span className="text-[10px] font-black uppercase tracking-widest">{t("return")}</span>
      </Link>

      {/* --- TACTICAL HEADER BLOCK --- */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* AVATAR BOX */}
            <div className="relative shrink-0">
              <div className="w-36 h-36 md:w-48 md:h-48 bg-gradient-to-br from-zinc-800 to-black rounded-[2rem] md:rounded-[3rem] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="Pilot" />
                ) : (
                  <span className="text-4xl md:text-5xl font-black italic text-zinc-700 tracking-tighter">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-xl border-4 border-[#0a0a0a]">
                <ShieldCheck size={18} className="text-black" />
              </div>
            </div>

            {/* IDENTITY TEXT */}
            <div className="text-center md:text-left">
              <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.4em] mb-2 md:mb-4 opacity-80">
                Flight Pilot Identification
              </p>
              <div className="space-y-0 md:-space-y-4">
                <h1 className="text-5xl md:text-8xl font-black italic uppercase text-white tracking-tighter leading-none">
                  {profile?.first_name}
                </h1>
                <h1 className="text-5xl md:text-8xl font-black italic uppercase text-primary tracking-tighter leading-none">
                  {profile?.last_name}
                </h1>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-4 md:mt-6">
                <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">
                  UID: {id.slice(0, 8)}
                </span>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {t("active_status")}
                </span>
              </div>
            </div>
          </div>

          {/* EDIT BUTTON */}
          <div className="lg:w-fit">
            <Link 
              href={`/staff/clients/${id}/edit`}
              className="bg-white text-black py-4 px-10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-white/5 shadow-xl group"
            >
              <Edit3 size={16} className="group-hover:rotate-12 transition-transform" /> 
              {t("modify")}
            </Link>
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT: CORE INTEL */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 space-y-8 relative overflow-hidden">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-4">
            {t("core_intel")}
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between group/row">
              <InfoRow 
                icon={<Phone size={14}/>} 
                label={t("comms")} 
                value={profile?.phone} 
                fallback="N/A" 
              />
              {profile?.phone && (
                <a 
                  href={`tel:${profile.phone}`}
                  className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary hover:bg-primary hover:text-black transition-all active:scale-95 shadow-xl group"
                >
                  <Phone size={16} className="animate-pulse group-hover:animate-none" />
                </a>
              )}
            </div>

            <InfoRow icon={<Mail size={14}/>} label={t("network")} value={profile?.email} fallback="N/A" />
            <InfoRow icon={<MapPin size={14}/>} label={t("sector")} value={profile?.address} fallback="N/A" />
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest">{t("transmission")}</p>
            <span className={`px-6 py-3 rounded-2xl text-xs font-black uppercase inline-block border ${client?.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
              {client?.gear_type || 'Manual'}
            </span>
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
      <div className="p-4 bg-white/5 rounded-2xl text-slate-500 group-hover:text-primary transition-all border border-white/5 group-hover:border-primary/20">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-sm font-bold text-white uppercase tracking-tight">{value || fallback}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, sub }: any) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-primary/10 transition-all">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</p>
        <h4 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">{value}</h4>
        <p className="text-[9px] font-black text-slate-600 uppercase mt-3 tracking-widest">{sub}</p>
      </div>
      <div className="p-5 bg-white/5 rounded-3xl border border-white/5 group-hover:bg-primary/5 transition-all">
        {icon}
      </div>
    </div>
  )
}