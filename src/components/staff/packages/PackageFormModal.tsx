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
import { Checkbox } from "@/components/ui/checkbox"
import { useForm, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Clock, ShieldCheck, Loader2, Tag } from "lucide-react"

const formSchema = z.object({
  account_id: z.string().min(1, "Required"),
  course_id: z.string().min(1, "Required"),
  total_hours: z.coerce.number().min(1),
  contract_price: z.coerce.number().min(0),
  amount_paid_today: z.coerce.number().min(0),
  use_discount: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

interface Course {
  id: string
  name: string
  base_price: number
  discounted_price: number | null
  total_hours: number
}

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
  const [courses, setCourses] = useState<Course[]>([])
  const [instructorId, setInstructorId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      account_id: "",
      course_id: "",
      total_hours: 10,
      contract_price: 0,
      amount_paid_today: 0,
      use_discount: false,
    },
  })

  const control = form.control as unknown as Control<FormValues>

  // Синхронизация цены при переключении чекбокса
  const updatePrice = (courseId: string, useDiscount: boolean) => {
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      const price = (useDiscount && selected.discounted_price) 
        ? selected.discounted_price 
        : selected.base_price
      form.setValue("contract_price", price)
    }
  }

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !isOpen) return
      
      try {
        setFetching(true)

        // 1. Get current instructor ID
        const { data: instData, error: instErr } = await supabase
          .from("instructors")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle()

        if (instErr) throw instErr
        setInstructorId(instData?.id || null)

        // 2. Fetch Accounts
        const { data: accData, error: accErr } = await supabase
          .from("accounts")
          .select(`
            id,
            clients!inner (
              profiles!clients_profile_id_fkey (
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

        // 3. Fetch Courses (including discounted_price)
        const { data: courData, error: courErr } = await supabase
          .from("courses")
          .select("id, name, base_price, discounted_price, total_hours")
          .eq("is_active", true)
        
        if (courErr) throw courErr
        if (courData) setCourses(courData as Course[])

      } catch (err: any) {
        console.error("CRITICAL: Modal Data Fetch Error:", err)
        toast.error(err.message || "Failed to load clients or courses")
      } finally {
        setFetching(false)
      }
    }

    fetchData()
  }, [user?.id, isOpen])

  useEffect(() => {
    async function loadExistingPackage() {
      if (!packageId || !isOpen) return
      setFetching(true)
      try {
        const { data, error } = await supabase
          .from("course_packages")
          .select("*")
          .eq("id", packageId)
          .single()

        if (error) throw error
        if (data) {
          form.reset({
            account_id: data.account_id,
            course_id: data.course_id,
            total_hours: data.total_hours,
            contract_price: data.contract_price,
            amount_paid_today: 0,
            use_discount: false,
          })
        }
      } catch (err: any) {
        toast.error("Error loading package: " + err.message)
      } finally {
        setFetching(false)
      }
    }
    loadExistingPackage()
  }, [packageId, isOpen, form])

  const onCourseChange = (courseId: string) => {
    if (packageId) return 
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      form.setValue("total_hours", selected.total_hours)
      // Сбрасываем чекбокс при смене курса и ставим базовую цену
      form.setValue("use_discount", false)
      form.setValue("contract_price", selected.base_price)
    }
  }

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      let currentPkgId = packageId

      // 1. Upsert Package
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

      // 2. Handle Payment
      if (values.amount_paid_today > 0 && currentPkgId) {
        const { data: payData, error: payErr } = await supabase
          .from("payments")
          .insert({
            account_id: values.account_id,
            amount: values.amount_paid_today,
            status: "completed",
            notes: packageId ? `Top-up for package ${packageId}` : `Initial payment`,
            created_by_profile_id: profile?.id
          })
          .select().single()

        if (payErr) throw payErr

        const { error: allocErr } = await supabase.from("course_payment_allocations").insert({
          payment_id: payData.id,
          course_package_id: currentPkgId,
          amount_allocated: values.amount_paid_today
        })
        if (allocErr) throw allocErr
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
      <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-2xl rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-10 text-left">
            <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              {packageId ? "Edit" : t("title")} <span className="text-primary">{packageId ? "Package" : t("subtitle")}</span>
            </DialogTitle>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
              {packageId ? "Modify existing contract details" : t("description")}
            </p>
          </DialogHeader>

          {fetching ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Form {...(form as any)}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("client")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!packageId}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-16 text-white rounded-xl">
                              <SelectValue placeholder={accounts.length === 0 ? "Loading clients..." : t("selectClient")} />
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
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("course")}</FormLabel>
                        <Select onValueChange={(v) => { field.onChange(v); onCourseChange(v); }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-16 text-white rounded-xl">
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

                {/* DISCOUNT TOGGLE */}
                <FormField
                  control={control}
                  name="use_discount"
                  render={({ field }) => {
                    const selectedCourse = courses.find(c => c.id === form.watch("course_id"));
                    const hasDiscount = !!selectedCourse?.discounted_price;

                    return (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-2xl border border-white/5 p-4 bg-white/5">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            disabled={!hasDiscount || !!packageId}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              updatePrice(form.getValues("course_id"), !!checked);
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className={`text-[10px] font-black uppercase flex items-center gap-2 ${hasDiscount ? "text-white" : "text-slate-600"}`}>
                            <Tag size={12} className={hasDiscount ? "text-primary" : ""} />
                            Apply promotional price
                          </FormLabel>
                          {!hasDiscount && form.watch("course_id") && (
                            <p className="text-[8px] text-slate-500 uppercase tracking-tighter">No discount available for this course</p>
                          )}
                        </div>
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={control}
                    name="total_hours"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                          <Clock size={12}/> {t("hours")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-black border-white/5 h-16 text-white font-black text-lg rounded-xl" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="contract_price"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">{t("price")}</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="bg-black border-white/5 h-16 text-white font-black text-lg rounded-xl" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 flex justify-between items-center relative overflow-hidden">
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] mb-2">{t("totalValue")}</p>
                      <div className="text-4xl font-black italic text-primary uppercase tracking-tighter">
                         {Number(form.watch("contract_price") || 0).toLocaleString()} <span className="text-xs not-italic text-primary/40 ml-2">UAH</span>
                      </div>
                   </div>
                   <ShieldCheck className="text-primary/10 absolute -right-4 -bottom-4" size={120} />
                </div>


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

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary text-black font-black uppercase py-10 rounded-2xl hover:bg-white transition-all text-sm tracking-[0.3em]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : `${packageId ? 'Update' : t("activate")} 🏁`}
                </Button>
              </form>
            </Form>
          )}
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