"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { 
  X, Check, Wallet, User, 
  CreditCard, Loader2,
  Banknote, Hash, FileText, Trash2, Info, Search,
  Layers 
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useTranslations } from "next-intl"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editPayment?: any
  instructorId: string | null
}

export function PaymentModal({ isOpen, onClose, onSuccess, editPayment, instructorId }: PaymentModalProps) {
  const t = useTranslations("Payments")
  const { profile } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([]) 
  const [methods, setMethods] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    course_package_id: "",
    account_id: "", // Critical: payments table needs this
    amount: "",
    payment_plan_id: "",
    payment_method_id: "",
    status: "completed",
    notes: ""
  })

  // 1. Load Reference Data & Packages
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      // Query for active packages - Note: account_id must be in the view!
      let pkgQuery = supabase
        .from('staff_packages_view')
        .select(`id, account_id, account_label, contract_price, total_paid, instructor_id, status`)
        .eq('status', 'active')
      
      if (instructorId) pkgQuery = pkgQuery.eq('instructor_id', instructorId)

      const [pkgs, plansData, methodsData] = await Promise.all([
        pkgQuery,
        supabase.from('payment_plans').select('*').order('slug'),
        supabase.from('payment_methods').select('*').order('slug')
      ])

      if (pkgs.data) {
        setPackages(pkgs.data.map(pkg => ({
          ...pkg,
          balance_due: pkg.contract_price - (pkg.total_paid || 0)
        })))
      }
      if (plansData.data) setPlans(plansData.data)
      if (methodsData.data) setMethods(methodsData.data)
    }

    fetchData()

    if (editPayment) {
      setFormData({
        course_package_id: editPayment.course_package_id || "",
        account_id: editPayment.account_id || "",
        amount: editPayment.amount?.toString() || "",
        payment_plan_id: editPayment.payment_plan_id || "",
        payment_method_id: editPayment.payment_method_id || "",
        status: editPayment.status || "completed",
        notes: editPayment.notes || ""
      })
    } else {
      setFormData({
        course_package_id: "",
        account_id: "",
        amount: "",
        payment_plan_id: "",
        payment_method_id: "",
        status: "completed",
        notes: ""
      })
    }
  }, [isOpen, editPayment, instructorId])

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => 
      pkg.account_label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [packages, searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.course_package_id || !formData.amount || !formData.payment_method_id || !formData.payment_plan_id) {
      return toast.error(t('fillRequired'))
    }

    setLoading(true)
    const amountNum = parseFloat(formData.amount)
    const paymentId = editPayment?.payment_id || editPayment?.id

    try {
      const payload = {
        account_id: formData.account_id, // Ensure payment is linked to the client account
        amount: amountNum,
        payment_plan_id: formData.payment_plan_id,
        payment_method_id: formData.payment_method_id,
        status: formData.status,
        notes: formData.notes,
        created_by_profile_id: profile?.id
      }

      if (editPayment) {
        const { error: pError } = await supabase.from('payments').update(payload).eq('id', paymentId)
        if (pError) throw pError

        await supabase.from('course_payment_allocations').update({
          amount_allocated: amountNum,
          course_package_id: formData.course_package_id
        }).eq('payment_id', paymentId)

        toast.success(t('updateSuccess'))
      } else {
        const { data: newPayment, error: pError } = await supabase
          .from('payments')
          .insert([payload])
          .select().single()

        if (pError) throw pError

        await supabase.from('course_payment_allocations').insert([{
          payment_id: newPayment.id,
          course_package_id: formData.course_package_id,
          amount_allocated: amountNum
        }])

        toast.success(t('logSuccess'))
      }
      onSuccess() 
      onClose()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedPkg = packages.find(p => p.id === formData.course_package_id)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
              <Wallet size={20} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
              {editPayment ? t('adjustTransaction') : t('logPayment')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          
          {/* 1. PACKAGE SELECTION */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
              <User size={12} /> {t('targetPackage')}
            </label>
            <div className="space-y-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={14} />
                <input 
                  type="text"
                  placeholder={t('searchStudent')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-[11px] font-bold text-white outline-none focus:border-primary/30 transition-all"
                />
              </div>

              <select 
                value={formData.course_package_id}
                onChange={(e) => {
                  const pkg = packages.find(p => p.id === e.target.value);
                  setFormData({
                    ...formData, 
                    course_package_id: e.target.value,
                    account_id: pkg ? pkg.account_id : "", // Set the account_id here
                    amount: pkg ? pkg.balance_due.toString() : "" 
                  });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-black text-slate-500">
                  {filteredPackages.length > 0 ? t('selectPackage') : t('noMatches')}
                </option>
                {filteredPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id} className="bg-black text-white">
                    {pkg.account_label} — Debt: {pkg.balance_due.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            {selectedPkg && (
               <div className="flex items-center gap-2 px-2 text-[9px] font-bold uppercase text-primary/60 italic">
                 <Info size={10} /> Total Package: {selectedPkg.contract_price.toLocaleString()} UAH
               </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 2. AMOUNT */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
                <Banknote size={12} /> {t('amountLabel')}
              </label>
              <input 
                type="number" step="0.01" placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-black italic text-white outline-none focus:border-primary transition-all tabular-nums"
              />
            </div>

            {/* 3. STATUS */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
                <Hash size={12} /> {t('statusLabel')}
              </label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-black text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="completed" className="bg-black text-emerald-500">{t('statusPaid')}</option>
                <option value="pending" className="bg-black text-amber-500">{t('statusPending')}</option>
                <option value="failed" className="bg-black text-red-500">{t('statusVoid')}</option>
              </select>
            </div>
          </div>

          {/* 4. PAYMENT PLAN */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
              <Layers size={12} /> {t('paymentPlan')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setFormData({...formData, payment_plan_id: plan.id})}
                  className={`py-3 rounded-xl border text-[9px] font-black uppercase italic transition-all ${
                    formData.payment_plan_id === plan.id 
                    ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' 
                    : 'bg-white/5 border-white/10 text-slate-500'
                  }`}
                >
                  {t(plan.label_key) || plan.slug.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 5. PAYMENT METHOD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
              <CreditCard size={12} /> {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setFormData({...formData, payment_method_id: method.id})}
                  className={`py-3 rounded-xl border text-[9px] font-black uppercase italic transition-all ${
                    formData.payment_method_id === method.id 
                    ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' 
                    : 'bg-white/5 border-white/10 text-slate-500'
                  }`}
                >
                  {t(method.label_key) || method.slug}
                </button>
              ))}
            </div>
          </div>

          {/* 6. NOTES */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
              <FileText size={12} /> {t('notesLabel')}
            </label>
            <textarea 
              placeholder={t('notesPlaceholder')}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all resize-none h-16"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {editPayment && (
              <button 
                type="button" 
                onClick={async () => {
                   if (!window.confirm(t('confirmDelete'))) return;
                   setLoading(true);
                   const idToDelete = editPayment.payment_id || editPayment.id;
                   await supabase.from('payments').delete().eq('id', idToDelete);
                   onSuccess();
                   onClose();
                }} 
                disabled={loading}
                className="p-5 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
              </button>
            )}
            <button 
              type="submit" disabled={loading}
              className="flex-1 bg-primary text-black py-5 rounded-[1.5rem] font-black uppercase italic tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-primary/10 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} strokeWidth={4} />}
              {editPayment ? t('btnUpdate') : t('btnConfirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}