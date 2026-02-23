"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Search, Plus, Wallet, 
  Loader2, CheckCircle2, 
  Clock, AlertCircle,
  Edit2
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import { PaymentModal } from "@/components/staff/PaymentModal"

export default function PaymentsPage() {
  const t = useTranslations("Payments")
  const locale = useLocale()
  const dateLocale = locale === "ru" ? ru : enUS
  const { profile } = useAuth()

  // --- STATE ---
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  
  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  // 1. Resolve Instructor Identity (Required for filtering views)
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      if (profile.role === 'instructor') {
        const { data } = await supabase
          .from('instructors')
          .select('id')
          .eq('profile_id', profile.id)
          .single()
        if (data) setTargetInstructorId(data.id)
      }
    }
    init()
  }, [profile])

  // 2. Fetch Logic (Synchronized with payment_ledger_view)
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('payment_ledger_view')
        .select('*')

      // Role-based security filtering
      if (profile?.role === 'instructor' && targetInstructorId) {
        query = query.eq('instructor_id', targetInstructorId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setPayments(data || [])
    } catch (error: any) {
      console.error("Fetch error:", error)
      toast.error("Failed to sync ledger")
    } finally {
      setLoading(false)
    }
  }, [profile, targetInstructorId])

  useEffect(() => {
    // Start fetching once identity is established
    if (profile?.role === 'admin' || (profile?.role === 'instructor' && targetInstructorId)) {
      fetchPayments()
    }
  }, [fetchPayments, profile, targetInstructorId])

  // 3. Search Filtering (Student Name + Last Name)
  const filteredPayments = payments.filter(p => {
    const fullName = `${p.client_name || ''} ${p.client_last_name || ''}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-4 md:p-10 pb-24">
      
      {/* HEADER: COMMAND CENTER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 self-start">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
              {t('title')}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Financial Registry / {profile?.role}
            </p>
          </div>
        </div>

        <button 
          onClick={() => { setSelectedPayment(null); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus size={18} strokeWidth={4} />
          {t('addPayment')}
        </button>
      </div>

      {/* TACTICAL SEARCH */}
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text"
            placeholder={t('searchStudent')}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-sm font-bold outline-none focus:border-primary transition-all shadow-inner placeholder:text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* DATA AREA: LEDGER TABLE */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        
        {/* DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">
                  {t('columnStudent')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">
                  {t('columnAmount')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">
                  {t('columnMethodPlan')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">
                  {t('columnDate')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-center">
                  {t('columnStatus')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-right">
                  {t('columnEdit')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                <LoadingRow />
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-black text-sm uppercase italic truncate">
                        {p.client_name} {p.client_last_name}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-base text-primary tabular-nums italic">
                        {p.amount.toLocaleString()} UAH
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-white/70 italic leading-none">
                          {t(p.method_localization_key) || p.method_slug}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">
                          {t(p.plan_localization_key) || p.plan_slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-400 tabular-nums">
                      {format(new Date(p.created_at), 'dd.MM.yyyy', { locale: dateLocale })}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <StatusBadge status={p.status} t={t} />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => { 
                          setSelectedPayment({ ...p, id: p.payment_id }); 
                          setIsModalOpen(true); 
                        }}
                        className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-xl text-slate-500 transition-all active:scale-90"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-slate-600 font-black uppercase italic text-xs">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW: TACTICAL CARDS */}
        <div className="md:hidden divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center uppercase font-black text-[10px] text-slate-500 animate-pulse">Syncing...</div>
          ) : filteredPayments.map((p) => (
            <div 
              key={p.payment_id} 
              onClick={() => { setSelectedPayment({ ...p, id: p.payment_id }); setIsModalOpen(true); }}
              className="p-5 flex items-center justify-between active:bg-white/5 transition-all"
            >
              <div className="flex flex-col gap-1">
                <p className="font-black text-xs uppercase italic leading-none text-white">
                  {p.client_name} {p.client_last_name}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-slate-500 font-bold">
                    {format(new Date(p.created_at), 'dd MMM', { locale: dateLocale })}
                  </p>
                  <span className="text-[9px] text-primary/40 font-black italic uppercase">
                    • {t(p.method_localization_key) || p.method_slug}
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="font-black text-sm text-primary italic leading-none">
                  {p.amount.toLocaleString()} UAH
                </p>
                <StatusBadge status={p.status} t={t} mobile />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LEDGER MODAL */}
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPayments}
        editPayment={selectedPayment}
        instructorId={targetInstructorId}
      />
    </div>
  )
}

/**
 * Status Badge Component with Tactical Styling
 */
function StatusBadge({ status, t, mobile = false }: { status: string, t: any, mobile?: boolean }) {
  const configs: any = {
    completed: { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 size={mobile ? 10 : 12} />, labelKey: 'statusPaid' },
    pending: { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: <Clock size={mobile ? 10 : 12} />, labelKey: 'statusPending' },
    failed: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: <AlertCircle size={mobile ? 10 : 12} />, labelKey: 'statusVoid' }
  }
  const config = configs[status] || configs.pending
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.color} ${mobile ? 'text-[8px]' : 'text-[10px]'} font-black uppercase italic tracking-tight`}>
      {config.icon} {!mobile && t(config.labelKey)}
    </div>
  )
}

/**
 * Skeleton Loading Row for Ledger Synchronization
 */
function LoadingRow() {
  return (
    <tr>
      <td colSpan={6} className="py-20 text-center">
        <Loader2 className="animate-spin inline text-primary mb-4" size={32} />
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Syncing Tactical Ledger...</p>
      </td>
    </tr>
  )
}