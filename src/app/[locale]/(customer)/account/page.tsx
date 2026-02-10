import { supabase } from "@/lib/supabase"
import { 
  Wallet, 
  GraduationCap, 
  MessageSquare, 
  ArrowUpRight, 
  ShieldCheck, 
  CreditCard,
  User
} from "lucide-react"
import Link from "next/link"

export default async function ClientLandingPage() {
  // 1. In a real app, get this from supabase.auth.getUser()
  const clientId = "dee3e0c3-b8d9-48b2-bd9c-0ba63624b2b0"; 

  const { data: info } = await supabase
    .from('client_training_details')
    .select('*')
    .eq('client_id', clientId)
    .single();

  const hasDebt = (info?.total_balance || 0) < 0;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 pb-24">
      {/* 1. OPERATIONAL STATUS HEADER */}
      <header className="flex justify-between items-start pt-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            {info?.name || "Rider"} <span className="text-primary">.</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Система Активна</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
          {info?.avatar_url ? (
            <img src={info.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="text-slate-600" size={24} />
          )}
        </div>
      </header>

      {/* 2. FINANCIAL STATUS CARD */}
      <div className={`rounded-[2.5rem] p-6 border transition-all ${
        hasDebt ? "bg-red-500/10 border-red-500/20" : "bg-[#0a0a0a] border-white/5"
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Баланс Аккаунта</p>
            <h3 className={`text-3xl font-black tracking-tight ${hasDebt ? "text-red-500" : "text-white"}`}>
              {info?.total_balance || 0} €
            </h3>
          </div>
          <Link href="/ru/account/billing" className="p-4 bg-white/5 rounded-2xl hover:bg-white hover:text-black transition-all">
            <CreditCard size={20} />
          </Link>
        </div>
        {hasDebt && (
          <p className="mt-4 text-[10px] font-bold uppercase text-red-500 animate-pulse">
            Требуется пополнение для записи на новые занятия
          </p>
        )}
      </div>

      {/* 3. ACTIVE COURSE MISSION HUD */}
      <div className="bg-primary p-8 rounded-[3rem] text-black relative overflow-hidden group shadow-[0_20px_50px_rgba(var(--primary),0.15)]">
        <GraduationCap className="absolute -right-6 -top-6 opacity-10 group-hover:rotate-12 transition-transform duration-500" size={140} />
        
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Текущий Прогресс</p>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-6 mt-1">
            {info?.course_name || "Курс не выбран"}
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span>Осталось часов</span>
              <span>{info?.remaining_hours || 0} / {info?.total_hours || 0}</span>
            </div>
            <div className="h-3 bg-black/10 rounded-full overflow-hidden border border-black/5">
              <div 
                className="h-full bg-black transition-all duration-1000" 
                style={{ width: `${((info?.total_hours - info?.remaining_hours) / info?.total_hours) * 100}%` }}
              />
            </div>
          </div>
          
          <Link 
            href="/ru/account/training" 
            className="mt-8 flex items-center justify-center gap-2 w-full py-4 bg-black text-white rounded-2xl font-black uppercase italic text-[10px] hover:bg-slate-900 transition-colors"
          >
            Детали обучения <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* 4. INSTRUCTOR & SUPPORT */}
      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 bg-[#0a0a0a] border border-white/5 rounded-[2rem] flex items-center justify-between group hover:border-white/20 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
              {info?.lead_instructor_name?.charAt(0) || <ShieldCheck />}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Шеф-Инструктор</p>
              <p className="text-sm font-bold text-white tracking-tight">{info?.lead_instructor_name || "School Support"}</p>
            </div>
          </div>
          <button className="p-3 bg-white/5 text-slate-400 group-hover:text-primary rounded-xl transition-all">
            <MessageSquare size={20} />
          </button>
        </div>
      </div>

      {/* 5. FOOTER INFO */}
      <div className="text-center pt-4">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">
          Rider System v3.2.0
        </p>
      </div>
    </div>
  )
}