"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Bike, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"

interface TrainingPackage {
  id: string
  total_hours: number
  remaining_hours: number
  status: string
  accounts: {
    full_name: string
  }
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<TrainingPackage[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchPackages() {
      const { data } = await supabase
        .from("enrollments")
        .select(`
          id, 
          total_hours, 
          remaining_hours, 
          status,
          accounts (full_name)
        `)
        .eq("service_id", "training_package")
        .order("created_at", { ascending: false })

      if (data) setPackages(data as any)
    }
    fetchPackages()
  }, [])

  const filtered = packages.filter(p => 
    p.accounts.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            Training <span className="text-primary">Packages</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Active Contracts & Hour Tracking
          </p>
        </div>

        <Link 
          href="/staff/packages/new" 
          className="flex items-center gap-2 bg-primary text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-colors"
        >
          <Plus size={18} /> New Package
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input 
          placeholder="SEARCH RIDER NAME..." 
          className="pl-12 bg-[#080808] border-white/5 h-14 text-xs font-black uppercase tracking-widest focus-visible:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pkg) => {
          const progress = (pkg.remaining_hours / pkg.total_hours) * 100
          
          return (
            <div key={pkg.id} className="bg-[#080808] border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <Bike className="text-primary" size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                  pkg.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                }`}>
                  {pkg.status}
                </div>
              </div>

              <h3 className="text-lg font-black uppercase italic tracking-tighter mb-1">
                {pkg.accounts.full_name}
              </h3>
              
              <div className="flex items-center gap-2 text-slate-500 mb-6">
                <Clock size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {pkg.remaining_hours} / {pkg.total_hours} Hours Left
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] font-black text-slate-600 text-right uppercase">
                {Math.round(progress)}% Remaining
              </p>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-[#080808] rounded-3xl border border-dashed border-white/10">
          <p className="text-slate-500 font-black uppercase tracking-[0.2em]">No active packages found</p>
        </div>
      )}
    </div>
  )
}