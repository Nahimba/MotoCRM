"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Search, Plus, Wallet, 
  Loader2, CheckCircle2, 
  Clock, AlertCircle, User,
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

  // State
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  // 1. Resolve Identity (Check if instructor or admin)
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

  // 2. Optimized Fetch Logic using the Database View
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('payment_ledger_view')
        .select('*')

      // Filtering by instructor happens at the database level
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
    if (profile?.role === 'admin' || targetInstructorId) {
      fetchPayments()
    }
  }, [fetchPayments, profile, targetInstructorId])

  // 3. Simple Search Filtering
  const filteredPayments = payments.filter(p => {
    const fullName = `${p.client_name} ${p.client_last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-4 md:p-10 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 self-start">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Wallet size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            {t('title') || 'Ledger'}
          </h1>
        </div>

        <button 
          onClick={() => { setSelectedPayment(null); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-95 shadow-lg shadow-primary/10"
        >
          <Plus size={18} strokeWidth={4} />
          {t('addPayment') || 'Add Payment'}
        </button>
      </div>

      {/* SEARCH */}
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search student name..."
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-sm font-bold outline-none focus:border-primary transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* DATA AREA */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Student</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Amount</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Date</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? <LoadingRow /> : filteredPayments.map((p) => (
                <tr key={p.payment_id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black border border-white/5 uppercase">
                        {p.client_name?.[0] || '?'}
                      </div>
                      <p className="font-black text-sm uppercase italic truncate">
                        {p.client_name} {p.client_last_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-black text-base text-primary tabular-nums italic">{p.amount}€</span>
                  </td>
                  <td className="px-8 py-6 text-[11px] font-bold text-slate-400 tabular-nums">
                    {format(new Date(p.created_at), 'dd.MM.yyyy', { locale: dateLocale })}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => { 
                        // Note: We rename payment_id back to id so the Modal works correctly
                        setSelectedPayment({ ...p, id: p.payment_id }); 
                        setIsModalOpen(true); 
                      }}
                      className="p-2 hover:bg-white/10 rounded-xl text-slate-600 hover:text-white transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center uppercase font-black text-[10px] text-slate-500 animate-pulse">Syncing...</div>
          ) : filteredPayments.map((p) => (
            <div 
              key={p.payment_id} 
              onClick={() => { setSelectedPayment({ ...p, id: p.payment_id }); setIsModalOpen(true); }}
              className="p-5 flex items-center justify-between active:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-500">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-black text-xs uppercase italic leading-none mb-1 text-white">
                    {p.client_name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {format(new Date(p.created_at), 'dd MMM', { locale: dateLocale })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-sm text-primary italic leading-none mb-1">{p.amount}€</p>
                <StatusBadge status={p.status} mobile />
              </div>
            </div>
          ))}
        </div>
      </div>

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

function StatusBadge({ status, mobile = false }: { status: string, mobile?: boolean }) {
  const configs: any = {
    completed: { color: 'text-emerald-500 bg-emerald-500/10', icon: <CheckCircle2 size={mobile ? 10 : 12} />, label: 'Paid' },
    pending: { color: 'text-amber-500 bg-amber-500/10', icon: <Clock size={mobile ? 10 : 12} />, label: 'Wait' },
    failed: { color: 'text-red-500 bg-red-500/10', icon: <AlertCircle size={mobile ? 10 : 12} />, label: 'Void' }
  }
  const config = configs[status] || configs.pending
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${config.color} ${mobile ? 'text-[8px]' : 'text-[10px]'} font-black uppercase italic`}>
      {config.icon} {!mobile && config.label}
    </div>
  )
}

function LoadingRow() {
  return (
    <tr>
      <td colSpan={6} className="py-20 text-center">
        <Loader2 className="animate-spin inline text-primary mb-4" size={32} />
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Securing Ledger...</p>
      </td>
    </tr>
  )
}