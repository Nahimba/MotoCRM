"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, Edit3, Phone, Mail, 
  MapPin, CreditCard, Clock, Bike, ShieldCheck,
  AlertCircle, CheckCircle2, BadgePercent, Activity, FileText,
  Loader2, Plus
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { DocumentModal } from "@/components/staff/DocumentModal"


import PackageFormModal from "@/components/staff/packages/PackageFormModal"

import { toast } from "sonner"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("Clients.details")
  const { id } = use(params)
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const router = useRouter()


  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [docCount, setDocCount] = useState(0) // Optional: to show count in sidebar

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false)

  const refreshData = async () => {
    const { count, error } = await supabase
      .from('client_documents')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);
  
    if (!error) setDocCount(count || 0);
  };

  // Function to refresh client data after a new package is added
  const refreshClientData = async () => {
    setLoading(true)
    // Re-run your existing fetch logic or move it to a named function
    // For now, we can just trigger a router refresh or re-fetch manually
    router.refresh() 
    // Note: Since you use local state 'setClient', it's better to 
    // wrap your existing useEffect logic into a function called 'loadClientData' 
    // and call it here.
  }


//   3. Production Call (React/Node)

// In production, your client must be authenticated. The invoke method automatically attaches the user's JWT.
// JavaScript

// const handleSendInvite = async (clientId) => {
//   const { data, error } = await supabase.functions.invoke('send-invite', {
//     body: { targetUserId: clientId }
//   })

//   if (error) {
//     console.error('Action failed:', error)
//     return
//   }
//   alert('Invite sent successfully!')
// }



  const [isSending, setIsSending] = useState(false);

  const handleSendInvite = async () => {
    if (!client?.profile_id) return;
    setIsSending(true);
    try {
      // 1. Get the current session
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) throw new Error("Unauthorized");
  
      // 2. Invoke with Authorization header
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { profile_id: client.profile_id, template_slug: 'invitation_email_ua' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
  
      if (error) throw new Error(error.message);
      
      // 3. Handle response status
      if (data?.status === "already_confirmed") {
        alert("This student has already activated their account.");
      } else {
        alert("Invitation sent successfully!");
      }
    } catch (err: any) {
      console.error("DEBUG:", err);
      alert(`Failed: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSending(false);
    }
  };

  
  const [isResetting, setIsResetting] = useState(false);

  const handleResetRequest = async (studentId: string) => {
    if (!studentId) return;
    
    setIsResetting(true);
    
    try {
      // 1. Get the current session to pass the Admin's JWT
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) throw new Error("Unauthorized");
  
      // 2. Invoke the Edge Function with Authorization header
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { profile_id: studentId },
        headers: { 
          Authorization: `Bearer ${session.access_token}` 
        },
      });
  
      if (error) throw new Error(error.message);
  
      // 3. Handle specific response status or generic success
      if (data?.status === "already_confirmed") {
        toast.info("Цей учень вже активував свій акаунт, але лист для скидання пароля все одно надіслано.");
      } else {
        toast.success("Лист для скидання пароля надіслано успішно!");
      }
  
    } catch (err: any) {
      console.error("DEBUG_RESET:", err);
      toast.error(`Помилка відправки: ${err.message || "Непередбачена помилка"}`);
    } finally {
      setIsResetting(false);
    }
  };


  // const handleSendInvite = async () => {
  //   setIsSending(true);
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
      
  //     const { data, error } = await supabase.functions.invoke('send-invite', {
  //       body: { profile_id: client?.profile_id, template_slug: 'invitation_email_ua' },
  //       headers: { Authorization: `Bearer ${session?.access_token || ''}` },
  //     });
  
  //     if (error) throw new Error(error.message || "Function call failed");
      
  //     alert("Email sent successfully!");
  //   } catch (err: any) {
  //     console.error("DEBUG:", err);
  //     alert(`Failed: ${err.message}`);
  //   } finally {
  //     setIsSending(false);
  //   }
  // };



  // const [isSending, setIsSending] = useState(false);

  // const handleSendInvite = async () => {
  //   setIsSending(true);
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
      
  //     const { data, error } = await supabase.functions.invoke('send-invite', {
  //       method: 'POST', // Explicitly set to POST
  //       body: { 
  //         profile_id: client?.profile_id, 
  //         template_slug: 'invitation_email_ua' 
  //       },
  //       headers: { 
  //         Authorization: `Bearer ${session?.access_token}` 
  //       }
  //     })

  //     if (error) throw new Error(error.message || 'Failed to send invite');
      
  //     alert("Email sent successfully!");
  //   } catch (err: any) {
  //     console.error("Invite Error:", err);
  //     alert(err.message);
  //   } finally {
  //     setIsSending(false);
  //   }
  // };
  

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
              lessons (duration, status, is_counted)
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
    refreshData()
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

  
  // Перевіряємо, чи користувач вже хоча б раз підтвердив пошту / залогінився
  const isConfirmed = profile?.is_confirmed || false;
  
  // 1. FILTERED AGGREGATED STATS
  const totalHoursAll = packages.reduce((sum: number, p: any) => sum + (p.total_hours || 0), 0)
  
  const totalUsedHours = packages.reduce((sum: number, p: any) => {
    const pUsed = p.lessons?.filter((l: any) => l.is_counted === true) // Filter by is_counted
                   .reduce((s: number, l: any) => s + Number(l.duration), 0) || 0
    return sum + pUsed
  }, 0)
  
  const totalRemainingHours = Math.max(0, totalHoursAll - totalUsedHours)
  
  // 2. FINANCIAL STANDING (Using is_paid)
  const totalContractValue = packages.reduce((sum: number, p: any) => sum + (p.contract_price || 0), 0)
  const totalPaid = account?.payments?.filter((p: any) => p.is_paid === true) // Filter by is_paid
                             .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const totalDebt = totalContractValue - totalPaid

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase()




  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-6">
      
      <Link href="/staff/clients" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group w-fit">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        <span className="text-[10px] font-black uppercase tracking-widest">{t("return")}</span>
      </Link>

      {/* HEADER */}
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
              {/* <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-xl border-4 border-[#0a0a0a]">
                <ShieldCheck size={18} className="text-black" />
              </div> */}
            </div>

            <div className="text-center md:text-left">
              <div className="space-y-0">
                <h1 className="text-2xl md:text-3xl font-black italic uppercase text-white tracking-tighter leading-none">{profile?.first_name}</h1>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase text-primary tracking-tighter leading-none">{profile?.last_name}</h1>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-4 md:mt-6">
                {/* <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">UID: {id.slice(0, 8)}</span> */}
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${client?.is_active ? 'text-green-500' : 'text-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${client?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  {client?.is_active ? t("active_status") : "Неактивний"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Link href={`/staff/clients/${id}/edit`} className="bg-white text-black py-4 px-10 rounded-2xl font-black uppercase text-xs hover:bg-primary transition-all">
              {t("modify")}
            </Link>
            {!isConfirmed ? (
              /* КНОПКА ЗАПРОШЕННЯ: показуємо, якщо НЕ підтверджено */
              <button 
                onClick={handleSendInvite} 
                disabled={isSending} 
                className="bg-primary/10 text-primary border border-primary/20 py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-primary hover:text-black transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSending ? <Loader2 className="animate-spin" size={16} /> : "Надіслати Запрошення"}
              </button>
            ) : (
              /* КНОПКА СКИНУТИ ПАРОЛЬ: показуємо, якщо вже підтверджено */
              <button 
                onClick={() => handleResetRequest(client.profile_id)} 
                disabled={isResetting} 
                className="bg-zinc-800 text-zinc-400 border border-white/5 py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-primary hover:text-black transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isResetting ? <Loader2 className="animate-spin" size={16} /> : "Скинути Пароль"}
              </button>
            )}
            {/* <button onClick={handleSendInvite} disabled={isSending} className="bg-primary/10 text-primary border border-primary/20 py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-primary hover:text-black transition-all disabled:opacity-50">
              
              {isResetting ? <Loader2 className="animate-spin" /> : "Надіслати Запрошення"}
            </button>
            <button onClick={() => handleResetRequest(client.profile_id)} disabled={isResetting} className="bg-primary/10 text-primary border border-primary/20 py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-primary hover:text-black transition-all disabled:opacity-50">
              
              {isResetting ? <Loader2 className="animate-spin" /> : "Скинути Пароль"}
            </button> */}
            {/* {isSending ? t("sending") : t("send_invite")} */}
            {/* {isReseting ? t("sending") : t("reset_password")} */}
            {/* <button disabled={isResetting} onClick={() => handleResetRequest(client.profile_id)}>
              {isResetting ? <Loader2 className="animate-spin" /> : "Скинути пароль"}
            </button> */}
            
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: INFO */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 space-y-8 relative overflow-hidden">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-4">{t("core_intel")}</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between group/row">
              <InfoRow icon={<Phone size={14}/>} label={t("phone")} value={profile?.phone} fallback="N/A" />
              {profile?.phone && (
                <a href={`tel:${profile.phone}`} className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary hover:bg-primary hover:text-black transition-all shadow-xl">
                  <Phone size={16} />
                </a>
              )}
            </div>
            <InfoRow icon={<Mail size={14}/>} label={t("email")} value={profile?.email} fallback="N/A" />
            <InfoRow icon={<MapPin size={14}/>} label={t("address")} value={profile?.address} fallback="N/A" />
          </div>
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest">{t("transmission")}</p>
            <span className={`px-6 py-3 rounded-2xl text-xs font-black uppercase inline-block border ${client?.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
              {client?.gear_type || 'Manual'}
            </span>
          </div>

          <button 
            onClick={() => setIsDocModalOpen(true)}
            className="w-full bg-primary/10 border border-primary/20 hover:bg-primary hover:text-black py-4 rounded-2xl flex items-center justify-center gap-3 group transition-all font-black uppercase text-[10px] tracking-widest text-primary"
          >
            <FileText size={16} />
            Documents {docCount > 0 && <span className="bg-primary text-black px-2 py-0.5 rounded-md ml-1">{docCount}</span>}
          </button>
          
        </div>


        {/* RIGHT: STATS & PACKAGES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              label="Баланс" 
              value={`${totalDebt > 0 ? `-${totalDebt}` : 'Settled'}`} 
              unit={totalDebt > 0 ? "₴" : ""}
              icon={<CreditCard size={18} className={totalDebt > 0 ? "text-red-500" : "text-green-400"} />} 
              variant={totalDebt > 0 ? "danger" : "success"}
            />
            <StatCard 
              label="Залишок часу" 
              value={`${totalRemainingHours}H`} 
              icon={<Clock size={18} className="text-primary" />} 
              variant="default"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-4">Контракти</h3>
            
            {/* ADD CONTRACT BUTTON */}
            <button 
              onClick={() => setIsPackageModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all active:scale-95"
            >
              <Plus size={14} strokeWidth={4} />
              <span>Додати контракт</span>
            </button>
            {packages.length > 0 ? packages.map((pkg: any) => {
              const used = pkg.lessons?.filter((l: any) => l.is_counted).reduce((s: number, l: any) => s + Number(l.duration), 0) || 0;
              const percent = pkg.total_hours > 0 ? Math.round((used / pkg.total_hours) * 100) : 0;
              
              return (
                <div key={pkg.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-xl text-slate-500">
                        {percent === 100 ? <CheckCircle2 size={16} className="text-green-500" /> : <Activity size={16} className="text-primary" />}
                      </div>
                      <div>
                        <p className="text-lg font-black text-white italic uppercase tracking-tighter">{pkg.courses?.name || 'Package'}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{used} of {pkg.total_hours} г. виконано</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                       <span className="text-[10px] font-black text-white uppercase">{pkg.contract_price} ₴</span>
                    </div>
                  </div>

                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            }) : (
              <div className="bg-[#0a0a0a] border-2 border-dashed border-white/5 rounded-[2rem] py-12 text-center">
                <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-xs">No active packages</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <DocumentModal 
        clientId={id} 
        isOpen={isDocModalOpen} 
        onClose={() => setIsDocModalOpen(false)} 
        onUpdate={refreshData}
      />

      <PackageFormModal 
        isOpen={isPackageModalOpen}
        packageId ={null}
        // Pass the account ID from your fetched data
        accountId={account?.id} 
        onClose={() => setIsPackageModalOpen(false)}
        onSuccess={() => {
          setIsPackageModalOpen(false)
          router.refresh() // Refreshes server components/data
          // If you want to refresh the local 'client' state immediately:
          // loadClientData() 
        }} 
      />

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