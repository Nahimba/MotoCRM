// http://localhost:3000/en/staff/packages

"use client"

import { useEffect, useState } from "react"
import { Link } from "@/i18n/routing"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Bike, Clock, User, Users, ShieldAlert } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"

interface TrainingPackage {
  id: string
  total_hours: number
  remaining_hours: number
  status: string
  contract_price: number
  instructor_id: string 
  accounts: {
    account_label: string
  } | null
}

export default function PackagesPage() {
  const t = useTranslations("Packages")
  const { user, profile } = useAuth()
  const [packages, setPackages] = useState<TrainingPackage[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  
  // Set default based on role: Admin starts with "all", others with "mine"
  const [filterType, setFilterType] = useState<"all" | "mine">("mine")

  // Update filter type once the profile is loaded
  useEffect(() => {
    if (profile?.role === 'admin') {
      setFilterType("all")
    }
  }, [profile])

  useEffect(() => {
    async function fetchPackages() {
      setLoading(true)
      const { data, error } = await supabase
        .from("course_packages")
        .select(`
          id, 
          total_hours, 
          remaining_hours, 
          status,
          contract_price,
          instructor_id,
          accounts (account_label)
        `)
        .order("created_at", { ascending: false })

      if (!error && data) setPackages(data as any)
      setLoading(false)
    }
    fetchPackages()
  }, [])

  const filtered = packages.filter(p => {
    const matchesSearch = (p?.accounts?.account_label || "")
      .toLowerCase()
      .includes(search.toLowerCase())
    
    // Admin sees all if filterType is "all", Instructor only sees their ID matches
    const matchesInstructor = filterType === "all" || p.instructor_id === user?.id

    return matchesSearch && matchesInstructor
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-2">
            {t("title")} <span className="text-primary">{t("subtitle")}</span>
            {profile?.role === 'admin' && <ShieldAlert size={20} className="text-primary/50" />}
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            {profile?.role === 'admin' ? "Global Package Management" : t("description")}
          </p>
        </div>

        <Link 
          href="/staff/packages/new" 
          className="flex items-center gap-2 bg-primary text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
        >
          <Plus size={18} /> {t("newPackage")}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input 
            placeholder={t("searchPlaceholder")} 
            className="pl-12 bg-[#080808] border-white/5 h-14 text-xs font-black uppercase tracking-widest focus-visible:ring-primary focus:bg-[#0c0c0c] transition-all text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex bg-[#080808] border border-white/5 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setFilterType("mine")}
            className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterType === "mine" ? "bg-white/5 text-primary" : "text-slate-500 hover:text-white"
            }`}
          >
            <User size={14} /> {t("filters.mine")}
          </button>
          <button
            onClick={() => setFilterType("all")}
            className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterType === "all" ? "bg-white/5 text-primary" : "text-slate-500 hover:text-white"
            }`}
          >
            <Users size={14} /> {t("filters.all")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
           [...Array(6)].map((_, i) => (
            <div key={i} className="h-[200px] bg-[#080808] border border-white/5 rounded-2xl animate-pulse" />
          ))
        ) : filtered.map((pkg) => {
          const progress = (pkg.remaining_hours / pkg.total_hours) * 100
          return (
            <div key={pkg.id} className="bg-[#080808] border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-all group relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <Bike className="text-primary" size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                  pkg.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                }`}>
                  {t(`status.${pkg.status}` as any)}
                </div>
              </div>

              <h3 className="text-lg font-black uppercase italic tracking-tighter mb-1 truncate text-white">
                {pkg.accounts?.account_label || "No Account"}
              </h3>
              
              <div className="flex items-center gap-2 text-slate-500 mb-6">
                <Clock size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {t("hoursLeft", { remaining: pkg.remaining_hours, total: pkg.total_hours })}
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-700 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase">
                    {pkg.contract_price?.toLocaleString()} UAH
                  </p>
                  <p className="text-[10px] font-black text-primary uppercase">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 bg-[#080808] rounded-3xl border border-dashed border-white/10">
          <p className="text-slate-500 font-black uppercase tracking-[0.2em]">
            {t("noPackages")}
          </p>
        </div>
      )}
    </div>
  )
}