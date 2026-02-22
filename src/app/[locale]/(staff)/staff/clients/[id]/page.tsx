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
            payments (*),
            course_packages (
              *,
              courses (name),
              lessons (duration, status)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error("Fetch error:", error)
        router.push('/staff/clients')
      } else {
        setClient(data)
        const rawAvatar = data.profiles?.avatar_url
        if (rawAvatar) {
          if (rawAvatar.startsWith('http')) {
            setAvatarPreview(rawAvatar)
          } else {
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
  const packages = account?.course_packages || []
  
  // AGGREGATED STATS (Total across all packages)
  const totalHoursAll = packages.reduce((sum: number, p: any) => sum + (p.total_hours || 0), 0)
  const totalUsedHours = packages.reduce((sum: number, p: any) => {
    const pUsed = p.lessons?.filter((l: any) => l.status === 'completed')
                   .reduce((s: number, l: any) => s + Number(l.duration), 0) || 0
    return sum + pUsed
  }, 0)
  
  const totalRemainingHours = Math.max(0, totalHoursAll - totalUsedHours)
  
  // FINANCIAL STANDING
  const totalContractValue = packages.reduce((sum: number, p: any) => sum + (p.contract_price || 0), 0)
  const totalPaid = account?.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const totalDebt = totalContractValue - totalPaid

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-6">
      
      <Link href="/staff/clients" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group w-fit">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        <span className="text-[10px] font-black uppercase tracking-widest">{t("return")}</span>
      </Link>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
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

            <div className="text-center md:text-left">
              <div className="space-y-0 md:-space-y-0">
                <h1 className="text-2xl md:text-3xl font-black italic uppercase text-white tracking-tighter leading-none">{profile?.first_name}</h1>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase text-primary tracking-tighter leading-none">{profile?.last_name}</h1>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-4 md:mt-6">
                <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">UID: {id.slice(0, 8)}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${client?.is_active ? 'text-green-500' : 'text-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${client?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  {client?.is_active ? t("active_status") : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <Link href={`/staff/clients/${id}/edit`} className="bg-white text-black py-4 px-10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-xl group">
            <Edit3 size={16} className="group-hover:rotate-12 transition-transform" /> {t("modify")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: CORE INTEL */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 space-y-8 relative overflow-hidden">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-4">{t("core_intel")}</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between group/row">
              <InfoRow icon={<Phone size={14}/>} label={t("comms")} value={profile?.phone} fallback="N/A" />
              {profile?.phone && (
                <a href={`tel:${profile.phone}`} className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary hover:bg-primary hover:text-black transition-all shadow-xl">
                  <Phone size={16} />
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
          {/* STAT CARDS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              label={t("rem_time")} 
              value={`${totalRemainingHours}H`} 
              icon={<Clock size={20} className="text-primary" />} 
              sub={t("deployment", { total: totalHoursAll })} 
              variant="default"
            />
            <StatCard 
              label={t("fin_standing")} 
              value={`${totalDebt > 0 ? `-${totalDebt}` : '0'}`} 
              unit="₴"
              icon={<CreditCard size={20} className={totalDebt > 0 ? "text-red-500" : "text-green-500"} />} 
              sub={totalDebt > 0 ? t("outstanding") : t("settled")} 
              variant={totalDebt > 0 ? "danger" : "success"}
            />
          </div>

          {/* PACKAGE LIST */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-4">{t("active_module")}</h3>
            {packages.length > 0 ? packages.map((pkg: any) => {
              const used = pkg.lessons?.filter((l: any) => l.status === 'completed').reduce((s: number, l: any) => s + Number(l.duration), 0) || 0;
              const percent = pkg.total_hours > 0 ? Math.round((used / pkg.total_hours) * 100) : 0;
              
              return (
                <div key={pkg.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{pkg.courses?.name || 'Package'}</p>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full border font-black uppercase ${pkg.status === 'active' ? 'border-primary text-primary' : 'border-slate-700 text-slate-700'}`}>
                          {pkg.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-600 font-black uppercase tracking-widest">{t("valuation")}: {pkg.contract_price} ₴</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white italic leading-none">{percent}%</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{t("completion")}</p>
                    </div>
                  </div>
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            }) : (
              <div className="bg-[#0a0a0a] border-2 border-dashed border-white/5 rounded-[3rem] py-16 text-center">
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

function StatCard({ label, value, unit, icon, sub, variant }: any) {
  const textColor = variant === 'danger' ? 'text-red-500' : variant === 'success' ? 'text-green-500' : 'text-white';
  
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-primary/10 transition-all">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</p>
        <div className="flex items-baseline gap-1">
          <h4 className={`text-3xl md:text-4xl font-black italic tracking-tighter ${textColor}`}>{value}</h4>
          {unit && <span className={`text-xl font-black italic ${textColor}`}>{unit}</span>}
        </div>
        <p className="text-[9px] font-black text-slate-600 uppercase mt-3 tracking-widest">{sub}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-primary/5 transition-all">{icon}</div>
    </div>
  )
}