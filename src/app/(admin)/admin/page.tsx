"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toCsvRows, downloadFile } from "@/lib/csv"
import { 
  Zap, X, Loader2, Bike, Car, FileDown, 
  TrendingUp, Wallet, Users, PlusCircle, 
  Calendar, Target, ArrowUpRight, BarChart3,
  ShieldCheck
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
      const [ledgerRes, enrollmentRes] = await Promise.all([
        supabase.from("ledger_entries").select("amount"),
        supabase.from('enrollments').select(`
          id, remaining_hours,
          clients (id, full_name),
          courses (name, type, total_hours)
        `).eq('status', 'active')
      ])

      let totalInc = 0
      let totalExp = 0
      ledgerRes.data?.forEach(entry => {
        const val = Number(entry.amount)
        if (val > 0) totalInc += val
        else totalExp += Math.abs(val)
      })
      setStats({ income: totalInc, expenses: totalExp })

      if (enrollmentRes.data) {
        const formatted: RiderStatus[] = enrollmentRes.data.map((item: any) => ({
          enrollment_id: item.id,
          id: item.clients?.id,
          full_name: item.clients?.full_name || 'Anonymous',
          remaining_hours: item.remaining_hours,
          total_hours: item.courses?.total_hours || 1, 
          course_name: item.courses?.name || 'Standard Training',
          course_type: item.courses?.type || 'Moto'
        }))
        setRiders(formatted)
      }
    } catch (e: any) {
      toast.error("Telemetry Offline: Data Sync Failed")
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
      
      toast.success(`LOGGED: ${hours}h for ${selectedRider.full_name}`)
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
      const [clients, enrolls, ledger] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("enrollments").select("*"),
        supabase.from("ledger_entries").select("*"),
      ])
      const combined = [
        "CLIENTS", toCsvRows(clients.data || []),
        "ENROLLMENTS", toCsvRows(enrolls.data || []),
        "LEDGER", toCsvRows(ledger.data || []),
      ].join("\r\n")
      downloadFile(combined, `motocrm-blackbox-${Date.now()}.csv`)
      toast.success("Blackbox Backup Exported")
    } catch (e) {
      toast.error("Export Interrupted")
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
          <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">Command Center</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <ShieldCheck size={12} className="text-primary"/> Admin Intelligence Suite
          </p>
        </div>
        <button onClick={handleExportCsv} disabled={exporting} className="bg-white/5 border border-white/10 p-3 px-6 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all active:scale-95">
          <FileDown size={16} className="text-primary" /> {exporting ? "Compiling..." : "Export Blackbox"}
        </button>
      </div>

      {/* FINANCIAL STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Gross Revenue" value={`${stats.income.toLocaleString()} ₴`} icon={<TrendingUp size={16} className="text-green-500" />} />
        <StatCard label="Total Burn" value={`${stats.expenses.toLocaleString()} ₴`} icon={<Wallet size={16} className="text-red-500" />} />
        <StatCard label="Net Operations" value={`${(stats.income - stats.expenses).toLocaleString()} ₴`} icon={<ArrowUpRight size={16} className="text-primary" />} highlight />
      </div>

      {/* QUICK NAV - EXPANDED FOR ADMIN MANAGEMENT */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <NavButton href="/staff/clients" icon={<Users size={20}/>} label="Riders" sub={`${riders.length} Active`} />
        <NavButton href="/staff/clients/new" icon={<PlusCircle size={20}/>} label="Recruit" sub="New Enrollment" />
        <NavButton href="/staff/schedule" icon={<Calendar size={20}/>} label="Schedule" sub="Flight Deck" />
        
        <NavButton href="/admin/finances" icon={<BarChart3 size={20}/>} label="Finances" sub="P&L Ledger" />
        <NavButton href="/admin/courses" icon={<Bike size={20}/>} label="Courses" sub="Program Setup" />
        <NavButton href="/admin/instructors" icon={<Users size={20}/>} label="Instructors" sub="Fleet Staff" />
      </div>

      {/* ACTIVE FLEET */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <Target size={14} className="text-primary" /> Active Fleet Deployment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {riders.length === 0 ? (
            <div className="col-span-full py-20 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center bg-white/[0.02]">
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">No active deployments found</p>
            </div>
          ) : (
            riders.map((rider) => (
              <RiderCard key={rider.enrollment_id} rider={rider} onLog={() => setSelectedRider(rider)} />
            ))
          )}
        </div>
      </div>

      {/* LOGGING MODAL */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
            <button onClick={() => setSelectedRider(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X /></button>
            <div className="text-center mb-8">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Log Training Block</p>
              <h2 className="text-2xl font-black text-white italic uppercase leading-tight">{selectedRider.full_name}</h2>
              <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">{selectedRider.course_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 1.5, 2, 3].map(h => (
                <button 
                  key={h} 
                  onClick={() => handleLogSession(h)} 
                  className="py-6 bg-white/5 hover:bg-primary hover:text-black rounded-3xl font-black transition-all border border-white/5 uppercase text-sm flex flex-col items-center gap-1 group"
                >
                  <span className="text-xs text-slate-500 group-hover:text-black/50">+{h}</span>
                  Hours
                </button>
              ))}
            </div>
            {isLogging && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}
          </div>
        </div>
      )}
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
      <div className="text-3xl font-black text-white italic tracking-tighter">{value}</div>
    </div>
  )
}

function NavButton({ href, icon, label, sub }: any) {
  return (
    <Link href={href} className="bg-[#111] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all group text-center shadow-sm">
      <div className="text-slate-500 group-hover:text-primary transition-colors">{icon}</div>
      <p className="text-[10px] font-black text-white uppercase tracking-widest mt-2">{label}</p>
      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{sub}</p>
    </Link>
  )
}

function RiderCard({ rider, onLog }: { rider: RiderStatus; onLog: () => void }) {
  const isLow = rider.remaining_hours <= 2
  const isOut = rider.remaining_hours <= 0
  const progress = Math.max(0, Math.min(100, (rider.remaining_hours / rider.total_hours) * 100))

  return (
    <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-all group relative overflow-hidden shadow-sm text-white">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase mb-1 italic">
            {rider.course_type === 'Moto' ? <Bike size={12} className="text-primary" /> : <Car size={12} className="text-blue-400" />} 
            {rider.course_name}
          </p>
          <h3 className="font-black text-lg text-white uppercase italic tracking-tight leading-none">{rider.full_name}</h3>
        </div>
        <div className={`h-2 w-2 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
      </div>
      
      <div className="flex items-end justify-between mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Remaining</span>
          <p className="text-4xl font-black text-white tracking-tighter leading-none">
            {rider.remaining_hours}
            <span className="text-[10px] text-slate-500 ml-1 uppercase font-bold italic">HRS</span>
          </p>
        </div>
        <button 
          onClick={onLog} 
          disabled={isOut} 
          className="bg-white text-black h-10 px-6 rounded-xl font-black text-[10px] uppercase hover:bg-primary transition-all disabled:opacity-20 disabled:grayscale active:scale-95"
        >
          Quick Log
        </button>
      </div>

      <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-out ${isOut ? 'bg-red-900' : isLow ? 'bg-orange-500' : 'bg-primary'}`} 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  )
}