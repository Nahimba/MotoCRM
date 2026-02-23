"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  FileDown, TrendingUp, Wallet, Users, 
  PlusCircle, Calendar, ArrowUpRight, 
  BarChart3, ShieldCheck, GraduationCap, Loader2,
  Package, Database, Bike, Banknote, ClipboardList
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslations } from 'next-intl'

import { exportFullDatabase } from '@/components/export/export-utils-db-to-xlsx'; // Move the logic to a separate file
import { exportDataBackup, exportSchemaBackup } from '@/components/export/backup-utils-db-to-sql';

export default function UnifiedDashboard() {
  const t = useTranslations('admin.dashboard')
  const [stats, setStats] = useState({ income: 0, expenses: 0 })
  const [activeRidersCount, setActiveRidersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Export States
  const [exporting, setExporting] = useState(false)
  const [backingUp, setBackingUp] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  async function fetchData() {
    setLoading(true)
    try {
      const [incomeRes, expenseRes, trainingRes] = await Promise.all([
        supabase.from("payment_ledger_view").select("amount"),
        supabase.from("business_expenses").select("amount"),
        supabase.from('client_training_details').select('client_id').eq('package_status', 'active')
      ])

      const totalInc = incomeRes.data?.reduce((acc, p) => acc + Number(p.amount), 0) || 0
      const totalExp = expenseRes.data?.reduce((acc, e) => acc + Number(e.amount), 0) || 0
      
      setStats({ income: totalInc, expenses: totalExp })
      setActiveRidersCount(trainingRes.data?.length || 0)
    } catch (e: any) {
      toast.error(t('toasts.sync_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])


  // 1. XLSX (Business)
  const handleExport = async () => {
    await exportFullDatabase(setExporting);
  };

  // 2. SQL Data (Records)
  const handleDataBackup = async () => {
    setShowExportMenu(false);
    await exportDataBackup(setBackingUp);
  };

  // 3. SQL Schema (Views/Funcs)
  const handleSchemaBackup = async () => {
    setShowExportMenu(false);
    await exportSchemaBackup(setBackingUp);
  };


  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <Loader2 className="animate-spin text-primary" size={48} />
    </div>
  )

  return (
    <div className="space-y-10 pb-20 px-4 pt-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-2">
        <div>
          <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">
            {t('title')}
          </h1>
          {/* <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <ShieldCheck size={12} className="text-primary"/> {t('subtitle')}
          </p> */}
        </div>

        <div className="flex items-center gap-3">
          {/* XLSX Report */}
          <button 
            onClick={handleExport} 
            disabled={exporting || backingUp} 
            className="bg-white/5 border border-white/10 h-12 px-6 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileDown size={16} className={exporting ? "animate-bounce text-primary" : "text-primary"} /> 
            {exporting ? t('export_loading') : t('export_btn')}
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-primary/10 border border-primary/20 h-12 px-6 rounded-2xl text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-primary/20 transition-all active:scale-95"
            >
              <Database size={16} className={backingUp ? "animate-spin" : ""} />
              <div className="text-left leading-tight">
                <p>System Backup</p>
                <p className="text-[7px] opacity-60 font-bold italic lowercase">Choose type</p>
              </div>
              <Database size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-3 w-72 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-2 backdrop-blur-2xl">
                {/* OPTION 1: DATA */}
                <button 
                  onClick={handleDataBackup}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                >
                  <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20"><Database size={16} className="text-green-500" /></div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase italic">Full Data Dump</p>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Raw rows & records (.sql)</p>
                  </div>
                </button>

                {/* OPTION 2: METADATA */}
                <button 
                  onClick={handleSchemaBackup}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-left group"
                >
                  <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20"><ShieldCheck size={16} className="text-blue-500" /></div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase italic">Schema Definitions</p>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Views, Funcs & Metadata (.sql)</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="gap-4">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
          <ShieldCheck size={12} className="text-primary"/> {t('admin_menu')}
        </p>
      </div>

      {/* QUICK NAV */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

        <NavButton 
          href="/admin/finances" 
          icon={<BarChart3 size={20}/>} 
          label={t('nav.finances')} 
          sub={t('nav.finances_sub')} 
        />
        <NavButton 
          href="/admin/courses" 
          icon={<Package size={20}/>} 
          label={t('nav.courses')} 
          sub={t('nav.courses_sub')} 
        />
        <NavButton 
          href="/admin/instructors" 
          icon={<Users size={20}/>} 
          label={t('nav.instructors')} 
          sub={t('nav.instructors_sub')} 
        />
      </div>

      <div className="gap-4">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
          <ShieldCheck size={12} className="text-primary"/> {t('instructor_menu')}
        </p>
      </div>


      {/* QUICK NAV */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <NavButton 
          href="/staff" 
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


      {/* FINANCIAL STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label={t('stats.revenue')} 
          value={`${stats.income.toLocaleString()} ₴`} 
          icon={<TrendingUp size={16} className="text-green-500" />} 
        />
        <StatCard 
          label={t('stats.burn')} 
          value={`${stats.expenses.toLocaleString()} ₴`} 
          icon={<Wallet size={16} className="text-red-500" />} 
        />
        <StatCard 
          label={t('stats.net')} 
          value={`${(stats.income - stats.expenses).toLocaleString()} ₴`} 
          icon={<ArrowUpRight size={16} className="text-primary" />} 
          highlight 
        />
      </div>

    </div>
  )
}

/* UI SUB-COMPONENTS */

function StatCard({ label, value, icon, highlight }: any) {
  return (
    <div className={`bg-[#111] border ${highlight ? 'border-primary/40' : 'border-white/5'} rounded-[2rem] p-8 space-y-2 transition-all`}>
      <div className="flex justify-between items-center text-slate-500 uppercase font-black text-[9px] tracking-[0.2em]">
        {label} {icon}
      </div>
      <div className="text-3xl font-black text-white italic tracking-tighter uppercase">{value}</div>
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