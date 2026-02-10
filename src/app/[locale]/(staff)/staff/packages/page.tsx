"use client"

import { useEffect, useState } from "react"
import { Link } from "@/i18n/routing"
import { supabase } from "@/lib/supabase"
import { Plus, Search, User, Users, ShieldAlert, ArrowRight, Activity, Archive, Clock, Banknote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"

interface TrainingPackage {
  id: string
  total_hours: number
  remaining_hours: number
  status: string
  contract_price: number
  account_label: string
  instructor_profile_id: string
  instructor_name: string
}

export default function PackagesPage() {
  const t = useTranslations("Packages")
  const { user, profile } = useAuth()
  const [packages, setPackages] = useState<TrainingPackage[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  
  const [filterType, setFilterType] = useState<"all" | "mine">("mine")
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active")

  useEffect(() => {
    if (profile?.role === 'admin') setFilterType("all")
  }, [profile])

  useEffect(() => {
    async function fetchPackages() {
      if (!user?.id) return
      setLoading(true)
      const { data, error } = await supabase
        .from("staff_packages_view")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && data) setPackages(data as TrainingPackage[])
      setLoading(false)
    }
    fetchPackages()
  }, [user])

  const filtered = packages.filter(p => {
    const matchesSearch = (p.account_label || "").toLowerCase().includes(search.toLowerCase())
    const matchesInstructor = filterType === "all" || p.instructor_profile_id === user?.id
    const matchesStatus = statusFilter === "active" ? p.status === "active" : p.status !== "active"
    return matchesSearch && matchesInstructor && matchesStatus
  })

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 space-y-6 w-full max-w-full">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
              {t("title")} <span className="text-primary">{t("subtitle")}</span>
            </h1>
            {profile?.role === 'admin' && (
              <div className="px-2 py-0.5 border border-primary/30 rounded bg-primary/5 text-[9px] font-black uppercase text-primary tracking-widest">
                System Admin
              </div>
            )}
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            {profile?.role === 'admin' ? "Global Fleet Management" : t("description")}
          </p>
        </div>

        <Link 
          href="/staff/packages/new" 
          className="flex items-center justify-center gap-2 bg-primary text-black px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all"
        >
          <Plus size={18} strokeWidth={3} /> {t("newPackage")}
        </Link>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={18} />
          <Input 
            placeholder={t("searchPlaceholder")} 
            className="w-full pl-14 bg-[#0A0A0A] border-white/5 h-14 text-xs font-bold uppercase tracking-widest focus:border-primary/40 focus:ring-0 transition-all text-white rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-[#0A0A0A] border border-white/5 p-1 rounded-xl">
            <button onClick={() => setFilterType("mine")} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterType === "mine" ? "bg-white/10 text-primary" : "text-slate-500"}`}>
              {t("filters.mine")}
            </button>
            <button onClick={() => setFilterType("all")} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterType === "all" ? "bg-white/10 text-primary" : "text-slate-500"}`}>
              {t("filters.all")}
            </button>
          </div>

          <div className="flex bg-[#0A0A0A] border border-white/5 p-1 rounded-xl">
            <button onClick={() => setStatusFilter("active")} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "active" ? "bg-green-500/10 text-green-500" : "text-slate-500"}`}>
              {t("filters.active")}
            </button>
            <button onClick={() => setStatusFilter("inactive")} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "inactive" ? "bg-orange-500/10 text-orange-500" : "text-slate-500"}`}>
              {t("filters.archived")}
            </button>
          </div>
        </div>
      </div>

      {/* INLINE LIST */}
      <div className="w-full">
        {/* Table Head */}
        <div className="hidden lg:grid grid-cols-12 px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-white/5">
          <div className="col-span-4">Student Name</div>
          <div className="col-span-2 text-center">Instructor</div>
          <div className="col-span-3 text-center">Training Progress</div>
          <div className="col-span-2 text-center">Package Value</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#0A0A0A] animate-pulse" />
            ))
          ) : filtered.map((pkg) => {
            const progress = (pkg.remaining_hours / pkg.total_hours) * 100;
            const isLow = progress < 25;

            return (
              <Link 
                href={`/staff/packages/${pkg.id}`}
                key={pkg.id} 
                className="grid grid-cols-1 lg:grid-cols-12 items-center px-6 py-4 bg-[#0A0A0A]/30 hover:bg-[#0A0A0A] transition-all group"
              >
                {/* Name */}
                <div className="col-span-4">
                  <h3 className="font-black uppercase italic tracking-tighter text-lg group-hover:text-primary transition-colors">
                    {pkg.account_label}
                  </h3>
                </div>

                {/* Instructor */}
                <div className="col-span-2 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {pkg.instructor_name || '—'}
                  </p>
                </div>

                {/* Progress */}
                <div className="col-span-3 px-10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black tabular-nums tracking-tighter">
                      {pkg.remaining_hours} <span className="text-slate-600">/ {pkg.total_hours} HRS</span>
                    </span>
                    <span className={`text-[10px] font-black italic ${isLow ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isLow ? 'bg-red-600' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-2 text-center">
                  <p className="text-xs font-black tabular-nums text-slate-300">
                    {pkg.contract_price?.toLocaleString()} <span className="text-[9px] text-slate-600 ml-1">UAH</span>
                  </p>
                </div>

                {/* Action */}
                <div className="col-span-1 text-right">
                  <div className="inline-flex items-center gap-2 text-slate-600 group-hover:text-primary transition-all text-[10px] font-black uppercase">
                    <span className="hidden group-hover:inline transition-all opacity-0 group-hover:opacity-100">View</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* EMPTY STATE */}
        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center bg-[#0A0A0A]/30 rounded-b-xl border-t border-white/5">
            <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">No matches found</p>
          </div>
        )}
      </div>
    </div>
  )
}