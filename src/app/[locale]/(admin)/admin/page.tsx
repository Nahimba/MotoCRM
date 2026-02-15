"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toCsvRows, downloadFile } from "@/lib/csv"
import { 
  FileDown, TrendingUp, Wallet, Users, 
  PlusCircle, Calendar, ArrowUpRight, 
  BarChart3, ShieldCheck, Bike, Loader2
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslations } from 'next-intl'

export default function UnifiedDashboard() {
  const t = useTranslations('admin.dashboard')
  const [stats, setStats] = useState({ income: 0, expenses: 0 })
  const [activeRidersCount, setActiveRidersCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)

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

  async function handleExportCsv() {
    setExporting(true)
    try {
      const [clients, expenses, payments] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("business_expenses").select("*"),
        supabase.from("payments").select("*"),
      ])
      const combined = [
        "CLIENTS", toCsvRows(clients.data || []),
        "BUSINESS_EXPENSES", toCsvRows(expenses.data || []),
        "PAYMENTS", toCsvRows(payments.data || []),
      ].join("\r\n")
      downloadFile(combined, `motocrm-blackbox-${Date.now()}.csv`)
      toast.success(t('toasts.export_success'))
    } catch (e) {
      toast.error(t('toasts.export_error'))
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <Loader2 className="animate-spin text-primary" size={48} />
    </div>
  )

  return (
    <div className="space-y-10 pb-20 px-4 pt-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">
            {t('title')}
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <ShieldCheck size={12} className="text-primary"/> {t('subtitle')}
          </p>
        </div>
        <button 
          onClick={handleExportCsv} 
          disabled={exporting} 
          className="bg-white/5 border border-white/10 p-3 px-6 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all active:scale-95"
        >
          <FileDown size={16} className="text-primary" /> 
          {exporting ? t('export_loading') : t('export_btn')}
        </button>
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

      {/* QUICK NAV */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <NavButton 
          href="/staff/clients" 
          icon={<Users size={20}/>} 
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
          href="/staff/schedule" 
          icon={<Calendar size={20}/>} 
          label={t('nav.schedule')} 
          sub={t('nav.schedule_sub')} 
        />
        <NavButton 
          href="/admin/finances" 
          icon={<BarChart3 size={20}/>} 
          label={t('nav.finances')} 
          sub={t('nav.finances_sub')} 
        />
        <NavButton 
          href="/admin/courses" 
          icon={<Bike size={20}/>} 
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