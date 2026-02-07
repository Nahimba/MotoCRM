"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Clock, AlertCircle, CheckCircle2, Zap, X, Loader2, TrendingUp } from "lucide-react"
import { toast } from "sonner"

// Types for our CRM data
interface RiderStatus {
  id: string
  full_name: string
  remaining_hours: number
  status: string
}

export default function DashboardPage() {
  const [riders, setRiders] = useState<RiderStatus[]>([])
  const [selectedRider, setSelectedRider] = useState<RiderStatus | null>(null)
  const [isLogging, setIsLogging] = useState(false)
  const [loading, setLoading] = useState(true)

  // 1. Fetch data from Supabase (Joining Enrollments + Accounts)
  async function fetchDashboardData() {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          remaining_hours,
          status,
          accounts (id, full_name)
        `)
        .eq('status', 'active')

      if (error) throw error

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.accounts.id,
          full_name: item.accounts.full_name,
          remaining_hours: item.remaining_hours,
          status: item.status
        }))
        setRiders(formatted)
      }
    } catch (e: any) {
      toast.error("Failed to load riders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // 2. Handle the "Log Session" Logic
  async function handleLogSession(hours: number) {
    if (!selectedRider) return
    setIsLogging(true)

    try {
      const newBalance = selectedRider.remaining_hours - hours
      
      const { error: updateErr } = await supabase
        .from('enrollments')
        .update({ remaining_hours: newBalance })
        .eq('account_id', selectedRider.id)

      if (updateErr) throw updateErr

      toast.success(`Logged ${hours}h for ${selectedRider.full_name}`)
      setSelectedRider(null)
      fetchDashboardData() // Refresh UI with new balances
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLogging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return (
    <div className="space-y-8 relative">
      <header>
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">Track Command</h1>
        <p className="text-slate-500 font-medium">Manage active riders and log sessions.</p>
      </header>

      {/* QUICK STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Fleet</p>
          <p className="text-4xl font-black mt-1 text-primary">{riders.length}</p>
        </div>
        <div className="bg-card border p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Liability</p>
          <p className="text-4xl font-black mt-1">
            {riders.reduce((acc, r) => acc + (r.remaining_hours || 0), 0)}<span className="text-lg text-slate-500 italic">h</span>
          </p>
        </div>
      </div>

      {/* RIDER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {riders.map((rider) => (
          <RiderCard 
            key={rider.id} 
            rider={rider} 
            onLog={() => setSelectedRider(rider)} 
          />
        ))}
      </div>

      {/* SLIDE-OUT LOGGING PANEL */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl p-8 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black italic uppercase text-primary">Log Session</h2>
                <p className="text-sm text-slate-500">{selectedRider.full_name}</p>
              </div>
              <button 
                onClick={() => setSelectedRider(null)} 
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X />
              </button>
            </div>
            
            <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Current Balance</p>
              <p className="text-3xl font-black">{selectedRider.remaining_hours}h</p>
            </div>

            <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">Select Duration</p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[1, 1.5, 2, 2.5, 3, 4].map((h) => (
                <button
                  key={h}
                  onClick={() => handleLogSession(h)}
                  disabled={isLogging}
                  className="group relative py-6 bg-white/5 hover:bg-primary rounded-2xl font-black transition-all border border-white/5 hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <span className="group-hover:text-black">{h}h</span>
                </button>
              ))}
            </div>
            
            {isLogging && (
              <div className="flex items-center justify-center gap-3 text-primary animate-pulse">
                <Loader2 className="animate-spin" />
                <span className="font-bold italic uppercase tracking-tighter">Syncing with Cloud...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RiderCard({ rider, onLog }: { rider: RiderStatus; onLog: () => void }) {
  const isLow = rider.remaining_hours <= 2
  const isOut = rider.remaining_hours <= 0

  return (
    <div className={`group relative bg-card border border-white/5 rounded-2xl p-6 transition-all hover:border-primary/40 ${isOut ? 'opacity-70 bg-red-950/5 border-red-900/20' : ''}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-xl tracking-tight">{rider.full_name}</h3>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Active Enrollment</p>
        </div>
        <div className={`h-3 w-3 rounded-full ${isOut ? 'bg-red-600' : isLow ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className={`text-3xl font-black ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-white'}`}>
            {rider.remaining_hours}
            <span className="text-xs font-normal text-slate-500 uppercase italic ml-1">Hrs</span>
          </p>
        </div>

        <button 
          onClick={onLog}
          disabled={isOut}
          className="flex items-center gap-2 h-12 px-6 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all disabled:bg-slate-800 disabled:text-slate-500 disabled:scale-100"
        >
          <Zap size={14} fill="currentColor" />
          {isOut ? 'Empty' : 'Log Ride'}
        </button>
      </div>

      {/* Miniature Progress Bar */}
      <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isLow ? 'bg-orange-500' : 'bg-primary'}`}
          style={{ width: `${Math.min((rider.remaining_hours / 10) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}