"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toCsvRows, downloadFile } from "@/lib/csv"
import { 
  Zap, X, Loader2, Bike, Car, FileDown, 
  TrendingUp, Wallet, Users, PlusCircle, 
  Calendar, Target, ArrowUpRight 
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface RiderStatus {
  enrollment_id: string; 
  id: string; 
  full_name: string;
  remaining_hours: number;
  total_hours: number;
  course_name: string;
  course_type: string;
}

export default function UnifiedDashboard() {
  const [riders, setRiders] = useState<RiderStatus[]>([])
  const [stats, setStats] = useState({ income: 0, expenses: 0 })
  const [selectedRider, setSelectedRider] = useState<RiderStatus | null>(null)
  const [isLogging, setIsLogging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    try {
      // 1. Fetch Financials & Active Riders simultaneously
      const [payRes, expRes, enrollmentRes] = await Promise.all([
        supabase.from("payments").select("amount"),
        supabase.from("expenses").select("amount"),
        supabase.from('enrollments').select(`
          id, remaining_hours,
          accounts (id, full_name),
          courses (name, type, total_hours)
        `).eq('status', 'active')
      ])

      // Process Financials
      const totalInc = payRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
      const totalExp = expRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      setStats({ income: totalInc, expenses: totalExp })

      // Process Riders
      if (enrollmentRes.data) {
        const formatted: RiderStatus[] = enrollmentRes.data.map((item: any) => ({
          enrollment_id: item.id,
          id: item.accounts.id,
          full_name: item.accounts.full_name,
          remaining_hours: item.remaining_hours,
          total_hours: item.courses?.total_hours || 1, 
          course_name: item.courses?.name || 'Unknown Course',
          course_type: item.courses?.type || 'Auto'
        }))
        setRiders(formatted)
      }
    } catch (e: any) {
      toast.error("Systems Check Failed: Could not sync data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function handleLogSession(hours: number) {
    if (!selectedRider) return
    setIsLogging(true)
    try {
      const newBalance = selectedRider.remaining_hours - hours
      const { error } = await supabase
        .from('enrollments')
        .update({ remaining_hours: newBalance })
        .eq('id', selectedRider.enrollment_id)

      if (error) throw error
      toast.success(`Logged ${hours}h for ${selectedRider.full_name}`)
      setSelectedRider(null)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLogging(false)
    }
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const [clients, enrolls, payments, expenses] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("enrollments").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("expenses").select("*"),
      ])
      const combined = [
        "CLIENTS", toCsvRows(clients.data || []),
        "ENROLLMENTS", toCsvRows(enrolls.data || []),
        "PAYMENTS", toCsvRows(payments.data || []),
        "EXPENSES", toCsvRows(expenses.data || []),
      ].join("\r\n")
      downloadFile(combined, `moto-crm-backup-${Date.now()}.csv`)
      toast.success("Database Backup Exported")
    } catch (e) {
      toast.error("Export Failed")
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
    <div className="space-y-10 pb-20">
      {/* --- SECTION 1: HEADER & EXPORT --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">Command Center</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">Fleet Operations & Financial Intelligence</p>
        </div>
        <button onClick={handleExportCsv} disabled={exporting} className="bg-white/5 border border-white/10 p-3 px-6 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all">
          <FileDown size={16} /> {exporting ? "Syncing..." : "Full Backup"}
        </button>
      </div>

      {/* --- SECTION 2: FINANCIAL STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Revenue" value={`${stats.income} ₴`} icon={<TrendingUp className="text-green-500" />} />
        <StatCard label="Expenses" value={`${stats.expenses} ₴`} icon={<Wallet className="text-red-500" />} />
        <StatCard label="Net Profit" value={`${stats.income - stats.expenses} ₴`} icon={<ArrowUpRight className="text-primary" />} highlight />
      </div>

      {/* --- SECTION 3: QUICK NAV --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <NavButton href="/dashboard/clients" icon={<Users />} label="Riders" sub={`${riders.length} active`} />
        <NavButton href="/dashboard/clients/new" icon={<PlusCircle />} label="Recruit" sub="New Enrollment" />
        <NavButton href="/dashboard/calendar" icon={<Calendar />} label="Schedule" sub="Flight Deck" />
        <NavButton href="/dashboard/finance" icon={<Wallet />} label="Costs" sub="Log Expense" />
      </div>

      {/* --- SECTION 4: ACTIVE FLEET (TRACK COMMAND) --- */}
      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <Target size={14} className="text-primary" /> Active Fleet Deployment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {riders.map((rider) => (
            <RiderCard key={rider.enrollment_id} rider={rider} onLog={() => setSelectedRider(rider)} />
          ))}
        </div>
      </div>

      {/* --- LOGGING PANEL --- */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden">
            <button onClick={() => setSelectedRider(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
            <div className="text-center mb-8">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Log Training Session</p>
              <h2 className="text-2xl font-black text-white italic uppercase">{selectedRider.full_name}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 1.5, 2, 3].map(h => (
                <button key={h} onClick={() => handleLogSession(h)} className="py-6 bg-white/5 hover:bg-primary hover:text-black rounded-3xl font-black transition-all border border-white/5 uppercase text-sm">
                  {h} Hours
                </button>
              ))}
            </div>
            {isLogging && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
          </div>
        </div>
      )}
    </div>
  )
}

/* UI SUB-COMPONENTS */

function StatCard({ label, value, icon, highlight }: any) {
  return (
    <div className={`bg-[#111] border ${highlight ? 'border-primary/30' : 'border-white/5'} rounded-[2rem] p-8 space-y-2`}>
      <div className="flex justify-between text-slate-500 uppercase font-black text-[10px] tracking-widest">
        {label} {icon}
      </div>
      <div className="text-3xl font-black text-white italic">{value}</div>
    </div>
  )
}

function NavButton({ href, icon, label, sub }: any) {
  return (
    <Link href={href} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 transition-all group text-center">
      <div className="text-slate-500 group-hover:text-primary transition-colors">{icon}</div>
      <p className="text-[10px] font-black text-white uppercase tracking-widest">{label}</p>
      <p className="text-[8px] text-slate-600 font-bold uppercase">{sub}</p>
    </Link>
  )
}

function RiderCard({ rider, onLog }: { rider: RiderStatus; onLog: () => void }) {
  const isLow = rider.remaining_hours <= 2
  const isOut = rider.remaining_hours <= 0
  const progress = (rider.remaining_hours / rider.total_hours) * 100

  return (
    <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 hover:border-primary/40 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="flex items-center gap-1 text-[9px] font-black text-slate-600 uppercase mb-1">
            {rider.course_type === 'Moto' ? <Bike size={10} /> : <Car size={10} />} {rider.course_name}
          </p>
          <h3 className="font-black text-lg text-white uppercase italic">{rider.full_name}</h3>
        </div>
        <div className={`h-2 w-2 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
      </div>
      <div className="flex items-end justify-between mb-4">
        <p className="text-3xl font-black text-white tracking-tighter">{rider.remaining_hours}<span className="text-[10px] text-slate-500 ml-1 uppercase">hrs left</span></p>
        <button onClick={onLog} disabled={isOut} className="bg-primary text-black p-2 px-5 rounded-xl font-black text-[10px] uppercase hover:scale-105 transition-all disabled:opacity-20 disabled:grayscale">
          Log Session
        </button>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-700 ${isLow ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}