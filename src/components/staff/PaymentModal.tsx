"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  X, Check, Wallet, User, 
  CreditCard, Loader2,
  Banknote, Hash, FileText, Trash2, Info, Search,
  Layers, ChevronDown, CheckCircle2, Clock
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([]) 
  const [methods, setMethods] = useState<any[]>([])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    course_package_id: "",
    account_id: "",
    amount: "",
    payment_plan_id: "",
    payment_method_id: "",
    status: "completed",
    notes: ""
  })

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      let pkgQuery = supabase
        .from('staff_packages_view')
        .select(`id, account_id, account_label, course_name, contract_price, total_paid, total_hours, instructor_id, status`)
      
      if (instructorId) pkgQuery = pkgQuery.eq('instructor_id', instructorId)

      const [pkgs, plansData, methodsData] = await Promise.all([
        pkgQuery,
        supabase.from('payment_plans').select('*').order('slug'),
        supabase.from('payment_methods').select('*').order('slug')
      ])

      let processedPkgs: any[] = []
      if (pkgs.data) {
        processedPkgs = pkgs.data.map(pkg => ({
          ...pkg,
          balance_due: pkg.contract_price - (pkg.total_paid || 0)
        }))
        setPackages(processedPkgs)
      }
      if (plansData.data) setPlans(plansData.data)
      if (methodsData.data) setMethods(methodsData.data)

      if (editPayment) {
        const currentPkgId = editPayment.course_package_id || editPayment.package_id;
        
        setFormData({
          course_package_id: currentPkgId || "",
          account_id: editPayment.account_id || "",
          amount: editPayment.amount?.toString() || "",
          payment_plan_id: editPayment.payment_plan_id || "",
          payment_method_id: editPayment.payment_method_id || "",
          status: editPayment.status || "completed",
          notes: editPayment.notes || ""
        })

        const current = processedPkgs.find(p => p.id === currentPkgId)
        if (current) {
          setSearchTerm(`${current.account_label} — ${current.course_name}`)
        }
      } else {
        setFormData({
          course_package_id: "", account_id: "", amount: "",
          payment_plan_id: "", payment_method_id: "",
          status: "completed", notes: ""
        })
        setSearchTerm("")
      }
    }

    fetchData()
  }, [isOpen, editPayment, instructorId])

  // --- FIXED FILTER LOGIC ---
  const filteredPackages = useMemo(() => {
    // If user is editing and hasn't changed the search term yet, 
    // we want to ensure the current package is visible.
    return packages.filter(pkg => {
      // 1. VIP PASS: If this is the currently selected package, ALWAYS show it.
      if (pkg.id === formData.course_package_id) return true;

      // 2. If no search term, show everything
      if (!searchTerm) return true;

      // 3. Normal Search
      const searchLower = searchTerm.toLowerCase();
      return (
        pkg.account_label.toLowerCase().includes(searchLower) ||
        pkg.course_name?.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => (a.id === formData.course_package_id ? -1 : 1));
  }, [packages, searchTerm, formData.course_package_id])

  const selectedPkg = packages.find(p => p.id === formData.course_package_id)

  const handleSelect = (pkg: any) => {
    setFormData(prev => ({
      ...prev,
      course_package_id: pkg.id,
      account_id: pkg.account_id,
      amount: editPayment ? prev.amount : pkg.balance_due.toString()
    }))
    setSearchTerm(`${pkg.account_label} — ${pkg.course_name}`)
    setIsDropdownOpen(false)
  }

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
        account_id: formData.account_id,
        amount: amountNum,
        payment_plan_id: formData.payment_plan_id,
        payment_method_id: formData.payment_method_id,
        status: formData.status,
        notes: formData.notes,
        created_by_profile_id: profile?.id
      }

      if (editPayment) {
        await supabase.from('payments').update(payload).eq('id', paymentId)
        await supabase.from('course_payment_allocations')
          .update({ amount_allocated: amountNum, course_package_id: formData.course_package_id })
          .eq('payment_id', paymentId)
        toast.success(t('updateSuccess'))
      } else {
        const { data: newPay, error: pError } = await supabase.from('payments').insert([payload]).select().single()
        if (pError) throw pError
        
        await supabase.from('course_payment_allocations').insert([{
          payment_id: newPay.id,
          course_package_id: formData.course_package_id,
          amount_allocated: amountNum
        }])
        toast.success(t('logSuccess'))
      }
      onSuccess(); onClose();
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#050505] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-black">
              <Wallet size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                {editPayment ? t('adjustTransaction') : t('logPayment')}
              </h2>
              <p className="text-[10px] font-bold text-primary uppercase italic">{editPayment ? 'Modification' : 'New Entry'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="space-y-3 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
              <User size={12} className="text-primary" /> {t('clientAndPackage')}
            </label>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder={t('searchStudent')}
                value={searchTerm}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  // Optional: Clear search on focus to allow fresh searching immediately
                  // if (editPayment) setSearchTerm(""); 
                }}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4.5 pl-12 pr-10 text-sm font-bold text-white outline-none focus:border-primary/50 transition-all"
              />
              <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={16} />

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 max-h-[250px] overflow-y-auto bg-[#0A0A0A] border border-white/10 rounded-2xl z-[110] shadow-2xl no-scrollbar backdrop-blur-md">
                  {filteredPackages.length > 0 ? (
                    filteredPackages.map((pkg) => {
                      const isSelected = formData.course_package_id === pkg.id;
                      return (
                        <div 
                          key={pkg.id}
                          onClick={() => handleSelect(pkg)}
                          className={`p-4 border-b border-white/5 cursor-pointer transition-all flex items-center justify-between group
                            ${isSelected ? 'bg-primary/20 border-l-4 border-primary' : 'hover:bg-white/[0.05]'}`}
                        >
                          <div className="space-y-1">
                            <p className={`font-black uppercase italic text-xs ${isSelected ? 'text-primary' : 'text-white'}`}>
                              {pkg.account_label}
                            </p>
                            <p className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                               <Layers size={10} className="text-primary/70" /> {pkg.course_name} • {pkg.total_hours}h
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <p className={`text-[10px] font-black tabular-nums ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                              {pkg.balance_due.toLocaleString()} UAH
                            </p>
                            {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-600 text-[10px] font-black uppercase italic">{t('noMatches')}</div>
                  )}
                </div>
              )}
            </div>

            {selectedPkg && (
               <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-xl border border-primary/10 animate-in fade-in zoom-in-95">
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary italic">
                   <Info size={10} /> {selectedPkg.course_name} • {selectedPkg.contract_price.toLocaleString()} UAH
                 </div>
                 <div className="text-[9px] font-black uppercase text-emerald-500 italic">
                   Paid: {selectedPkg.total_paid.toLocaleString()} UAH
                 </div>
               </div>
            )}
          </div>

          {/* ... Remaining inputs (Amount, Status, Plan, Method, Notes, Buttons) are same as your original ... */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
                <Banknote size={12} className="text-primary" /> {t('amountLabel')}
              </label>
              <input 
                type="number" step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-4 text-sm font-black italic text-primary outline-none focus:border-primary tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 italic">
                <Hash size={12} className="text-primary" /> {t('statusLabel')}
              </label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-4 text-sm font-black text-white outline-none appearance-none cursor-pointer uppercase italic"
              >
                <option value="completed" className="bg-black text-emerald-500">{t('statusPaid')}</option>
                <option value="pending" className="bg-black text-amber-500">{t('statusPending')}</option>
                <option value="failed" className="bg-black text-red-500">{t('statusVoid')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 italic ml-1 flex items-center gap-2"><Layers size={12} className="text-primary"/> {t('paymentPlan')}</label>
            <div className="grid grid-cols-3 gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.id} type="button"
                  onClick={() => setFormData({...formData, payment_plan_id: plan.id})}
                  className={`py-3.5 rounded-xl border text-[9px] font-black uppercase italic transition-all ${
                    formData.payment_plan_id === plan.id 
                    ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {t(plan.label_key) || plan.slug}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 italic ml-1 flex items-center gap-2"><CreditCard size={12} className="text-primary"/> {t('paymentMethod')}</label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((method) => (
                <button
                  key={method.id} type="button"
                  onClick={() => setFormData({...formData, payment_method_id: method.id})}
                  className={`py-3.5 rounded-xl border text-[9px] font-black uppercase italic transition-all ${
                    formData.payment_method_id === method.id 
                    ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {t(method.label_key) || method.slug}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 italic flex items-center gap-2"><FileText size={12} /> {t('notesLabel')}</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary h-20 placeholder:text-slate-700 no-scrollbar"
            />
          </div>

          
          <div className="flex gap-3 pt-2 pb-safe-bottom-mobile">
            {editPayment && (
              <button 
                type="button" 
                onClick={async () => {
                   if (!window.confirm(t('confirmDelete'))) return;
                   setLoading(true);
                   const idToDelete = editPayment.payment_id || editPayment.id;
                   await supabase.from('payments').delete().eq('id', idToDelete);
                   onSuccess(); onClose();
                }} 
                className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={22} />}
              </button>
            )}
            <button 
              type="submit" disabled={loading}
              className="flex-1 bg-primary text-black h-16 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 hover:bg-white active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <Check size={20} strokeWidth={4} />
                  {editPayment ? t('btnUpdate') : t('btnConfirm')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}