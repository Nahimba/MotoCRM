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
import { Clock, ShieldCheck, Loader2, Tag, Lock } from "lucide-react"

const formSchema = z.object({
  account_id: z.string().min(1, "Required"),
  course_id: z.string().min(1, "Required"),
  total_hours: z.coerce.number().min(1),
  contract_price: z.coerce.number().min(0),
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
  const [isLocked, setIsLocked] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      account_id: "",
      course_id: "",
      total_hours: 10,
      contract_price: 0,
      use_discount: false,
    },
  })

  const control = form.control as unknown as Control<FormValues>

  const updatePrice = (courseId: string, useDiscount: boolean) => {
    if (isLocked) return 
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
        const { data: instData } = await supabase.from("instructors").select("id").eq("profile_id", user.id).maybeSingle()
        setInstructorId(instData?.id || null)

        const { data: accData } = await supabase.from("accounts").select(`id, clients!inner (profiles!clients_profile_id_fkey (first_name, last_name))`)
        if (accData) {
          const formatted = accData.map((acc: any) => ({
            id: acc.id,
            account_label: `${acc.clients?.profiles?.first_name || ''} ${acc.clients?.profiles?.last_name || ''}`.trim()
          }))
          setAccounts(formatted.sort((a, b) => a.account_label.localeCompare(b.account_label)))
        }

        const { data: courData } = await supabase.from("courses").select("*").eq("is_active", true)
        if (courData) setCourses(courData as Course[])
      } catch (err: any) {
        toast.error("Failed to load data")
      } finally {
        setFetching(false)
      }
    }
    fetchData()
  }, [user?.id, isOpen])

  useEffect(() => {
    async function loadExistingPackage() {
      if (!packageId || !isOpen) {
        if (!packageId) setIsLocked(false)
        return
      }
      setFetching(true)
      try {
        const { data: pkg } = await supabase.from("course_packages").select("*").eq("id", packageId).single()
        
        const [payments, lessons] = await Promise.all([
            supabase.from("course_payment_allocations").select("id", { count: 'exact', head: true }).eq("course_package_id", packageId),
            supabase.from("lessons").select("id", { count: 'exact', head: true }).eq("course_package_id", packageId)
        ])

        const hasActivity = (payments.count ?? 0) > 0 || (lessons.count ?? 0) > 0
        setIsLocked(hasActivity)

        if (pkg) {
          form.reset({
            account_id: pkg.account_id,
            course_id: pkg.course_id,
            total_hours: pkg.total_hours,
            contract_price: pkg.contract_price,
            use_discount: false, // Всегда false при загрузке, чтобы не ломать ручную цену
          })
        }
      } catch (err: any) {
        toast.error("Error loading package")
      } finally {
        setFetching(false)
      }
    }
    loadExistingPackage()
  }, [packageId, isOpen, form])

  const onCourseChange = (courseId: string) => {
    if (isLocked) return 
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      form.setValue("total_hours", selected.total_hours)
      form.setValue("use_discount", false)
      form.setValue("contract_price", selected.base_price)
    }
  }

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
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
        const { error } = await supabase
          .from("course_packages")
          .insert({
            account_id: values.account_id,
            course_id: values.course_id,
            instructor_id: instructorId,
            contract_price: values.contract_price,
            total_hours: values.total_hours,
            status: "active",
            created_by_profile_id: profile?.id
          })
        if (error) throw error
      }
      toast.success(packageId ? "Package updated" : t("success"))
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
            {isLocked && (
                <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Lock size={14} className="text-amber-500" />
                    <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest">
                        LOCKED: Payments or lessons already exist
                    </p>
                </div>
            )}
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!packageId || isLocked}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-16 text-white rounded-xl">
                              <SelectValue placeholder={t("selectClient")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id} className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer">
                                {a.account_label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="course_id"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("course")}</FormLabel>
                        <Select onValueChange={(v) => { field.onChange(v); onCourseChange(v); }} value={field.value} disabled={isLocked}>
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
                      </FormItem>
                    )}
                  />
                </div>

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
                            disabled={!hasDiscount || isLocked}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              updatePrice(form.getValues("course_id"), !!checked);
                            }}
                          />
                        </FormControl>
                        <FormLabel className={`text-[10px] font-black uppercase flex items-center gap-2 ${hasDiscount && !isLocked ? "text-white" : "text-slate-600"}`}>
                            <Tag size={12} className={hasDiscount ? "text-primary" : ""} /> Apply promotional price
                        </FormLabel>
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
                          <Input type="number" {...field} disabled={isLocked} className="bg-black border-white/5 h-16 text-white font-black text-lg rounded-xl" />
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
                          <Input type="number" {...field} disabled={isLocked} className="bg-black border-white/5 h-16 text-white font-black text-lg rounded-xl" />
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

                <div className="flex gap-3 pt-2 pb-safe-bottom-mobile">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-black font-black uppercase py-10 rounded-2xl hover:bg-white transition-all text-sm tracking-[0.3em]"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : `${packageId ? 'Update' : t("activate")} `}
                  </Button>
                </div>
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