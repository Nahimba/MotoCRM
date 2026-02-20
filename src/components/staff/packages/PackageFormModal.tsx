"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Clock, Wallet, ShieldCheck, Loader2, X } from "lucide-react"

const formSchema = z.object({
  account_id: z.string().min(1, "Required"),
  course_id: z.string().min(1, "Required"),
  total_hours: z.coerce.number().min(1),
  contract_price: z.coerce.number().min(0),
  amount_paid_today: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  isOpen: boolean
  packageId: string | null 
  onClose: () => void
  onSuccess: () => void
}

export default function PackageFormModal({ isOpen, packageId, onClose, onSuccess }: Props) {
  const t = useTranslations("NewPackage")
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  
  const [accounts, setAccounts] = useState<{ id: string; account_label: string }[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string; base_price: number; total_hours: number }[]>([])
  const [instructorId, setInstructorId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      account_id: "",
      course_id: "",
      total_hours: 10,
      contract_price: 0,
      amount_paid_today: 0,
    },
  })

  const control = form.control as unknown as Control<FormValues>

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: instData } = await supabase
          .from("instructors")
          .select("id")
          .eq("profile_id", user?.id)
          .maybeSingle()

        setInstructorId(instData?.id || null)

        const { data: accData, error: accErr } = await supabase
          .from("accounts")
          .select(`
            id,
            clients (
              profiles (
                first_name,
                last_name
              )
            )
          `)

        if (accErr) throw accErr

        if (accData) {
          const formatted = accData.map((acc: any) => {
            const p = acc.clients?.profiles
            return {
              id: acc.id,
              account_label: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : "Unnamed Client"
            }
          })
          setAccounts(formatted.sort((a, b) => a.account_label.localeCompare(b.account_label)))
        }

        const { data: courData } = await supabase
          .from("courses")
          .select("id, name, base_price, total_hours")
          .eq("is_active", true)
        
        if (courData) setCourses(courData)

      } catch (err) {
        console.error("Error loading modal data:", err)
        toast.error("Failed to load data")
      }
    }

    if (user?.id && isOpen) fetchData()
  }, [user, isOpen])

  useEffect(() => {
    async function loadExistingPackage() {
      if (!packageId || !isOpen) return
      setFetching(true)
      const { data, error } = await supabase
        .from("course_packages")
        .select("*")
        .eq("id", packageId)
        .single()

      if (data && !error) {
        form.reset({
          account_id: data.account_id,
          course_id: data.course_id,
          total_hours: data.total_hours,
          contract_price: data.contract_price,
          amount_paid_today: 0,
        })
      }
      setFetching(false)
    }
    loadExistingPackage()
  }, [packageId, isOpen, form])

  const onCourseChange = (courseId: string) => {
    if (packageId) return 
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      form.setValue("total_hours", selected.total_hours)
      form.setValue("contract_price", selected.base_price)
    }
  }

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      let currentPkgId = packageId

      if (packageId) {
        const { error } = await supabase
          .from("course_packages")
          .update({
            course_id: values.course_id,
            contract_price: values.contract_price,
            total_hours: values.total_hours,
          })
          .eq("id", packageId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("course_packages")
          .insert({
            account_id: values.account_id,
            course_id: values.course_id,
            instructor_id: instructorId,
            contract_price: values.contract_price,
            total_hours: values.total_hours,
            status: "active",
          })
          .select().single()

        if (error) throw error
        currentPkgId = data.id
      }

      toast.success(packageId ? "Package updated" : t("success"))
      form.reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col">
        
        {/* Mobile-Friendly Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-50 p-2 bg-white/5 rounded-full sm:hidden"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
          <DialogHeader className="mb-8 text-left">
            <DialogTitle className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-none">
              {packageId ? "Edit" : t("title")} <span className="text-primary">{packageId ? "Package" : t("subtitle")}</span>
            </DialogTitle>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
              {packageId ? "Modify existing contract" : t("description")}
            </p>
          </DialogHeader>

          {fetching ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Form {...(form as any)}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("client")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!packageId}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-14 md:h-16 text-white rounded-xl focus:ring-primary">
                              <SelectValue placeholder={accounts.length === 0 ? "Loading..." : t("selectClient")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0F0F0F] border-white/10 text-white max-h-60">
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id} className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer">
                                {a.account_label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="course_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("course")}</FormLabel>
                        <Select onValueChange={(v) => { field.onChange(v); onCourseChange(v); }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-14 md:h-16 text-white rounded-xl focus:ring-primary">
                              <SelectValue placeholder={t("selectCourse")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                            {courses.map(c => (
                              <SelectItem key={c.id} value={c.id} className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={control}
                    name="total_hours"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                          <Clock size={12}/> {t("hours")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="decimal" {...field} className="bg-black border-white/5 h-14 md:h-16 text-white font-black text-lg rounded-xl" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="contract_price"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">{t("price")}</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="decimal" {...field} className="bg-black border-white/5 h-14 md:h-16 text-white font-black text-lg rounded-xl" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-6 md:p-8 bg-primary/5 rounded-[1.5rem] md:rounded-[2rem] border border-primary/10 flex justify-between items-center relative overflow-hidden">
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] mb-1 md:mb-2">{t("totalValue")}</p>
                      <div className="text-3xl md:text-4xl font-black italic text-primary uppercase tracking-tighter">
                         {Number(form.watch("contract_price") || 0).toLocaleString()} <span className="text-[10px] not-italic text-primary/40 ml-1">UAH</span>
                      </div>
                   </div>
                   <ShieldCheck className="text-primary/10 absolute -right-4 -bottom-4" size={100} />
                </div>
              </form>
            </Form>
          )}
        </div>

        {/* Sticky Mobile Footer for Action Button */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent sm:relative sm:bg-none sm:p-12 sm:pt-0">
          <Button 
            onClick={form.handleSubmit(onSubmit as any)}
            disabled={loading}
            className="w-full bg-primary text-black font-black uppercase py-8 md:py-10 rounded-2xl hover:bg-white transition-all text-sm tracking-[0.3em] shadow-xl shadow-primary/10"
          >
            {loading ? <Loader2 className="animate-spin" /> : `${packageId ? 'Update' : t("activate")} 🏁`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}





                {/* <FormField
                  control={control}
                  name="amount_paid_today"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-[0.2em]">
                        <Wallet size={12}/> {packageId ? "Add Payment" : t("paymentToday")}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="bg-black border-primary/30 h-20 text-2xl font-black italic text-primary rounded-2xl" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                /> */}