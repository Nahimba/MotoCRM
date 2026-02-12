//http://localhost:3000/ru/staff/packages

"use client"

import { useEffect, useState } from "react"
import { Link } from "@/i18n/routing"
import { supabase } from "@/lib/supabase"
import { 
  Plus, Search, ArrowRight, Loader2, 
  Clock, Banknote, User, Target, Archive, ShieldCheck 
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"

interface TrainingPackage {
  id: string
  total_hours: number
  hours_used: number        // Updated from remaining_hours
  total_paid: number        // New field from our View
  contract_price: number
  status: string
  account_label: string
  instructor_profile_id: string
  instructor_name: string
  created_at: string
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

      if (!error && data) {
        setPackages(data as TrainingPackage[])
      }
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
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
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
          className="flex items-center justify-center gap-3 bg-primary text-black px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all shadow-xl shadow-primary/5 active:scale-95"
        >
          <Plus size={20} strokeWidth={4} /> {t("newPackage")}
        </Link>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={18} />
          <Input 
            placeholder={t("searchPlaceholder")} 
            className="w-full pl-14 bg-[#0A0A0A] border-white/5 h-16 text-xs font-bold uppercase tracking-widest focus:border-primary/40 focus:ring-0 transition-all text-white rounded-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-[#0A0A0A] border border-white/5 p-1.5 rounded-2xl">
            <button 
              onClick={() => setFilterType("mine")} 
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterType === "mine" ? "bg-white/10 text-primary" : "text-slate-500 hover:text-white"}`}
            >
              {t("filters.mine")}
            </button>
            <button 
              onClick={() => setFilterType("all")} 
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterType === "all" ? "bg-white/10 text-primary" : "text-slate-500 hover:text-white"}`}
            >
              {t("filters.all")}
            </button>
          </div>

          <div className="flex bg-[#0A0A0A] border border-white/5 p-1.5 rounded-2xl">
            <button 
              onClick={() => setStatusFilter("active")} 
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "active" ? "bg-emerald-500/10 text-emerald-500" : "text-slate-500 hover:text-white"}`}
            >
              {t("filters.active")}
            </button>
            <button 
              onClick={() => setStatusFilter("inactive")} 
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "inactive" ? "bg-orange-500/10 text-orange-500" : "text-slate-500 hover:text-white"}`}
            >
              {t("filters.archived")}
            </button>
          </div>
        </div>
      </div>

      {/* PACKAGES LIST */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-12 px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 bg-white/[0.02] border-b border-white/5">
          <div className="col-span-4 flex items-center gap-2"><User size={12}/> {t("table.student")}</div>
          <div className="col-span-2 text-center flex items-center justify-center gap-2"><Target size={12}/> {t("table.instructor")}</div>
          <div className="col-span-3 text-center flex items-center justify-center gap-2"><Clock size={12}/> {t("table.progress")}</div>
          <div className="col-span-2 text-center flex items-center justify-center gap-2"><Banknote size={12}/> {t("table.payment")}</div>
          <div className="col-span-1 text-right"></div>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-500">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">Initializing Fleet Data...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((pkg) => {
              // LOGIC: Remaining Hours = Total - Used
              const hoursRemaining = pkg.total_hours - pkg.hours_used;
              const progressPercent = pkg.total_hours > 0 ? (hoursRemaining / pkg.total_hours) * 100 : 0;
              const isLow = hoursRemaining <= 2;
              
              // LOGIC: Payment status
              const isFullyPaid = pkg.total_paid >= pkg.contract_price;

              return (
                <Link 
                  href={`/staff/packages/${pkg.id}`}
                  key={pkg.id} 
                  className="grid grid-cols-1 lg:grid-cols-12 items-center px-8 py-7 hover:bg-white/[0.02] transition-all group relative"
                >
                  {/* Name & Label */}
                  <div className="col-span-4">
                    <h3 className="font-black uppercase italic tracking-tighter text-2xl group-hover:text-primary transition-colors">
                      {pkg.account_label}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[9px] font-black uppercase text-slate-600 bg-white/5 px-2 py-0.5 rounded">ID: {pkg.id.split('-')[0]}</span>
                    </div>
                  </div>

                  {/* Instructor Name */}
                  <div className="col-span-2 text-center">
                    <p className="text-[11px] font-black uppercase text-slate-400">
                      {pkg.instructor_name || 'Unassigned'}
                    </p>
                  </div>

                  {/* Progress Visualizer */}
                  <div className="col-span-3 px-8">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black tabular-nums tracking-tighter">
                        {hoursRemaining} <span className="text-slate-600">/ {pkg.total_hours} HRS LEFT</span>
                      </span>
                      <span className={`text-[10px] font-black italic ${isLow ? 'text-red-500' : 'text-primary'}`}>
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${isLow ? 'bg-red-600' : 'bg-primary'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Payment Progress */}
                  <div className="col-span-2 text-center flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-black tabular-nums ${isFullyPaid ? 'text-emerald-500' : 'text-slate-200'}`}>
                        {pkg.total_paid?.toLocaleString()} 
                        <span className="text-[9px] text-slate-600 ml-1 tracking-widest uppercase">/ {pkg.contract_price}</span>
                      </p>
                      {isFullyPaid && <ShieldCheck size={14} className="text-emerald-500" />}
                    </div>
                    {!isFullyPaid && (
                      <p className="text-[8px] font-black text-orange-500/70 uppercase mt-1 tracking-tighter">
                        DEBT: {(pkg.contract_price - pkg.total_paid).toLocaleString()} UAH
                      </p>
                    )}
                  </div>

                  {/* Action Icon */}
                  <div className="col-span-1 text-right">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-slate-500 group-hover:bg-primary group-hover:text-black transition-all">
                      <ArrowRight size={18} strokeWidth={3} />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="py-32 text-center flex flex-col items-center justify-center gap-4">
              <Archive size={40} className="text-slate-800" />
              <div className="space-y-1">
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">No packages found in fleet</p>
                <p className="text-slate-700 text-[9px] font-bold uppercase">Try adjusting your filters or search terms</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}