"use client"

import { useState } from "react"
import { 
  PlusCircle, Calendar,
  ShieldCheck, GraduationCap,
  Bike, Banknote, ClipboardList
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from 'next-intl'


export default function UnifiedDashboard() {
  const t = useTranslations('admin.dashboard')
  const t2 = useTranslations('Staff')
  const [activeRidersCount, setActiveRidersCount] = useState(0)

  

  return (
    <div className="space-y-10 pb-20 px-4 pt-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-2">
        <div>
          <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">
            {t2('title')}
          </h1>
        </div>

      </div>


      <div className="gap-4">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
          <ShieldCheck size={12} className="text-primary"/> {t('instructor_menu')}
        </p>
      </div>


      {/* QUICK NAV */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <NavButton 
          href="/staff/lessons" 
          icon={<ClipboardList size={20}/>} 
          label={t('nav.lessons')} 
          sub={t('nav.lessons_sub')} 
        />
        <NavButton 
          href="/staff/schedule" 
          icon={<Calendar size={20}/>} 
          label={t('nav.schedule')} 
          sub={t('nav.schedule_sub')} 
        />
        <NavButton 
          href="/staff/clients" 
          icon={<GraduationCap size={20}/>} 
          label={t('nav.riders')} 
          sub={t('nav.riders_sub', { count: activeRidersCount })} 
        />
        <NavButton 
          href="/staff/clients/new" 
          icon={<PlusCircle size={20}/>} 
          label={t('nav.recruit')} 
          sub={t('nav.recruit_sub')} 
        />
        <NavButton 
          href="/staff/packages" 
          icon={<Bike size={20}/>} 
          label={t('nav.packages')} 
          sub={t('nav.packages_sub')} 
        />
        <NavButton 
          href="/staff/payments" 
          icon={<Banknote size={20}/>} 
          label={t('nav.payments')} 
          sub={t('nav.payments_sub')} 
        />
      </div>


    </div>
  )
}


function NavButton({ href, icon, label, sub }: any) {
  return (
    <Link href={href} className="bg-[#111] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all group text-center">
      <div className="text-slate-500 group-hover:text-primary transition-colors">{icon}</div>
      <p className="text-[10px] font-black text-white uppercase tracking-widest mt-2">{label}</p>
      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{sub}</p>
    </Link>
  )
} 