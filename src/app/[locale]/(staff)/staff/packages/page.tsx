"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Plus, Search, Loader2, 
  Clock, Banknote, Target, Archive, Briefcase, ChevronRight 
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"
import PackageFormModal from "@/components/staff/packages/PackageFormModal"

interface TrainingPackage {
  id: string
  total_hours: number
  hours_used: number
  total_paid: number
  contract_price: number
  status: string
  account_label: string
  course_name?: string
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

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role === 'admin') setFilterType("all")
  }, [profile])

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

  useEffect(() => { 
    fetchPackages() 
  }, [user])

  const filtered = packages.filter(p => {
    const searchStr = `${p.account_label} ${p.course_name || ''} ${p.instructor_name || ''}`.toLowerCase()
    const matchesSearch = searchStr.includes(search.toLowerCase())
    const matchesInstructor = filterType === "all" || p.instructor_profile_id === user?.id
    const matchesStatus = statusFilter === "active" ? p.status === "active" : p.status !== "active"
    return matchesSearch && matchesInstructor && matchesStatus
  })

  const handleCreateNew = () => {
    setSelectedPackageId(null)
    setIsModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setSelectedPackageId(id)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            {t("title")} <span className="text-primary">{t("subtitle")}</span>
          </h1>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] hidden sm:block">
            {profile?.role === 'admin' ? "Global Fleet Management" : t("description")}
          </p>
        </div>

        <button 
          onClick={handleCreateNew}
          className="flex-shrink-0 flex items-center justify-center gap-2 bg-primary text-black px-4 py-2.5 md:px-8 md:py-4 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-white transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={4} /> 
          <span className="hidden sm:inline">{t("newPackage")}</span>
        </button>
      </div>

      {/* COMPACT FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={16} />
          <Input 
            placeholder={t("searchPlaceholder")} 
            className="w-full pl-11 bg-[#0A0A0A] border-white/5 h-12 text-[10px] font-bold uppercase tracking-widest focus:border-primary/40 focus:ring-0 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {profile?.role === 'admin' && (
            <div className="flex bg-[#0A0A0A] border border-white/5 p-1 rounded-xl">
              {(['mine', 'all'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${filterType === type ? "bg-white/10 text-primary" : "text-slate-500"}`}
                >
                  {t(`filters.${type}`)}
                </button>
              ))}
            </div>
          )}

          <div className="flex bg-[#0A0A0A] border border-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setStatusFilter("active")} 
              className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${statusFilter === "active" ? "bg-emerald-500/10 text-emerald-500" : "text-slate-500"}`}
            >
              {t("filters.active")}
            </button>
            <button 
              onClick={() => setStatusFilter("inactive")} 
              className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${statusFilter === "inactive" ? "bg-orange-500/10 text-orange-500" : "text-slate-500"}`}
            >
              {t("filters.archived")}
            </button>
          </div>
        </div>
      </div>

      {/* LIST SECTION */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((pkg) => {
            const isLow = (pkg.total_hours - pkg.hours_used) <= 2;
            const isFullyPaid = pkg.total_paid >= pkg.contract_price;

            return (
              <div 
                key={pkg.id} 
                onClick={() => handleEdit(pkg.id)}
                className="bg-[#0A0A0A] border border-white/5 rounded-xl p-3 md:px-8 md:py-5 hover:bg-white/[0.02] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-4">
                  
                  {/* 1. Account, Course & Instructor Info */}
                  <div className="flex-1 min-w-0 md:max-w-[40%] space-y-1">
                    <h3 className="text-sm md:text-xl font-black uppercase italic tracking-tighter truncate group-hover:text-primary transition-colors leading-tight">
                      {pkg.account_label}
                    </h3>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={10} className="text-primary/60 flex-shrink-0" />
                        <p className="text-[9px] md:text-[11px] font-bold uppercase text-slate-300 truncate tracking-wide">
                          {pkg.course_name || "Training"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target size={10} className="text-slate-600 flex-shrink-0" />
                        <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 truncate tracking-widest">
                          {pkg.instructor_name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Usage & Payment Grouped */}
                  <div className="flex items-center gap-4 md:gap-12">
                    
                    {/* Usage */}
                    <div className="flex flex-col items-end md:items-start md:border-l border-white/5 md:pl-8 min-w-[60px]">
                      <div className="flex items-center gap-1 text-slate-600 mb-0.5">
                        <Clock size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest hidden md:inline">Usage</span>
                      </div>
                      <p className={`text-sm md:text-lg font-black tabular-nums ${isLow ? 'text-red-500' : 'text-white'}`}>
                        {pkg.hours_used}<span className="text-slate-600 text-[9px] md:text-[11px] ml-0.5">/{pkg.total_hours}</span>
                      </p>
                    </div>

                    {/* Payment */}
                    <div className="flex flex-col items-end md:items-start md:border-l border-white/5 md:pl-8 min-w-[70px]">
                      <div className="flex items-center gap-1 text-slate-600 mb-0.5">
                        <Banknote size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest hidden md:inline">Paid</span>
                      </div>
                      <div className="flex flex-col items-end md:items-start">
                        <p className={`text-sm md:text-lg font-black tabular-nums ${isFullyPaid ? 'text-emerald-500' : 'text-white'}`}>
                          {pkg.total_paid?.toLocaleString()}
                        </p>
                        {!isFullyPaid && (
                          <span className="text-[8px] font-black text-orange-500 uppercase leading-none">
                            -{ (pkg.contract_price - pkg.total_paid).toLocaleString() }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Action */}
                  <div className="flex-shrink-0 pl-2">
                    <ChevronRight size={18} className="text-slate-700 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-2xl">
            <Archive size={40} className="mx-auto text-slate-800 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">No packages found</p>
          </div>
        )}
      </div>

      <PackageFormModal 
        isOpen={isModalOpen}
        packageId={selectedPackageId}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPackageId(null)
        }}
        onSuccess={fetchPackages} 
      />
    </div>
  )
}