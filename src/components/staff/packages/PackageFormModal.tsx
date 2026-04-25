"use client"

import { useEffect, useState, useMemo } from "react"
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Clock, ShieldCheck, Loader2, Tag, Lock, Activity } from "lucide-react"

export const PACKAGE_STATUSES = ["active", "finished", "cancelled"] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

const formSchema = z.object({
  account_id: z.string().min(1, "Required"),
  course_id: z.string().min(1, "Required"),
  instructor_id: z.string().min(1, "Required"),
  total_hours: z.coerce.number().min(1),
  contract_price: z.coerce.number().min(0),
  is_discounted: z.boolean().default(false),
  status: z.enum(PACKAGE_STATUSES).default("active"),
})

type FormValues = z.infer<typeof formSchema>

interface Course {
  id: string
  name: string
  base_price: number
  discounted_price: number | null
  total_hours: number
  type: string
}

interface Props {
  isOpen: boolean
  packageId: string | null
  accountId?: string | null
  onClose: () => void
  onSuccess: () => void
}

export default function PackageFormModal({ isOpen, packageId, accountId, onClose, onSuccess }: Props) {
  const t = useTranslations("NewPackage")
  const tSt = useTranslations("Packages.status")
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
      is_discounted: false,
      status: "active",
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

  const [instructors, setInstructors] = useState<any[]>([]) 

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !isOpen) return
      try {
        setFetching(true)


        // const { data: instData } = await supabase.from("instructors").select("id").eq("profile_id", user.id).maybeSingle()
        // setInstructorId(instData?.id || null)

        // Fetch all instructors for the dropdown
        const { data: allInst } = await supabase
          .from("instructors")
          .select(`id, specializations, profiles (first_name, last_name)`)
        if (allInst) setInstructors(allInst)

        // Find current logged-in instructor
        const { data: currentInst } = await supabase
          .from("instructors")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle()

        // If creating NEW package, set default instructor to current user
        if (!packageId && currentInst) {
          form.setValue("instructor_id", currentInst.id)
        }

        
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

        // ADD THIS: If we are creating a new package and have an accountId prop
        if (!packageId && accountId) {
          form.setValue("account_id", accountId)
        }

      } catch (err: any) {
        toast.error("Failed to load data")
      } finally {
        setFetching(false)
      }
    }
    fetchData()
  }, [user?.id, isOpen, accountId, packageId])


  useEffect(() => {
    async function loadExistingPackage() {
      if (!packageId || !isOpen) {
        if (!packageId) {
          setIsLocked(false)
          form.reset({
            // account_id: "",
            account_id: accountId || "",
            course_id: "",
            total_hours: 10,
            contract_price: 0,
            is_discounted: false,
            status: "active",
          })
        }
        return
      }
      setFetching(true)
      try {
        const { data: pkg } = await supabase.from("course_packages").select("*").eq("id", packageId).single()
        
        const [payments, lessons] = await Promise.all([
            supabase.from("payments").select("id", { count: 'exact', head: true }).eq("course_package_id", packageId),
            supabase.from("lessons").select("id", { count: 'exact', head: true }).eq("course_package_id", packageId)
        ])

        const hasActivity = (payments.count ?? 0) > 0 || (lessons.count ?? 0) > 0

        // Change this line:
        // setIsLocked(hasActivity) 
        // To this (Temporary override): !!!!!!!!!!!!!
        setIsLocked(false)

        if (pkg) {
          form.reset({
            account_id: pkg.account_id,
            instructor_id: pkg.instructor_id,
            course_id: pkg.course_id,
            total_hours: pkg.total_hours,
            contract_price: pkg.contract_price,
            is_discounted: pkg.is_discounted || false,
            status: pkg.status as PackageStatus,
          })
        }
      } catch (err: any) {
        toast.error("Error loading package")
      } finally {
        setFetching(false)
      }
    }
    loadExistingPackage()
  }, [packageId, isOpen, form, accountId])

  const onCourseChange = (courseId: string) => {
    if (isLocked) return 
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      form.setValue("total_hours", selected.total_hours)
      //form.setValue("use_discount", false)
      form.setValue("is_discounted", false)
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
            instructor_id: values.instructor_id,
            course_id: values.course_id,
            contract_price: values.contract_price,
            total_hours: values.total_hours,
            status: values.status,
            is_discounted: values.is_discounted,
          })
          .eq("id", packageId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("course_packages")
          .insert({
            account_id: values.account_id,
            course_id: values.course_id,
            instructor_id: values.instructor_id,
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

  const selectedInstructorId = form.watch("instructor_id")

  const filteredCourses = useMemo(() => {
    if (!selectedInstructorId) return []
    
    const selectedInstructor = instructors.find(ins => ins.id === selectedInstructorId)
    if (!selectedInstructor || !selectedInstructor.specializations) return []

    // Filters courses where course.type exists within the instructor's specialization array
    return courses.filter(course => 
      selectedInstructor.specializations.includes(course.type)
    )
  }, [selectedInstructorId, instructors, courses])

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-2xl rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-10 text-left">
            <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              {packageId ? t("edit") : t("new")}
            </DialogTitle>
            {isLocked && (
                <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit">
                    <Lock size={14} className="text-amber-500" />
                    <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest">
                        Є Оплата / Урок
                    </p>
                </div>
            )}
          </DialogHeader>

          {fetching ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Form {...(form as any)}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">


                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <FormField
                    control={control}
                    name="instructor_id"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                          Інструктор
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-16 text-white rounded-xl">
                              <SelectValue placeholder="Оберіть інструктора" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                            {instructors.map((ins) => (
                              <SelectItem 
                                key={ins.id} 
                                value={ins.id} 
                                className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer"
                              >
                                {ins.profiles?.first_name} {ins.profiles?.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* <FormField
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
                  /> */}

                  <FormField
                    control={control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                          {t("client")}
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          // Combined logic: lock if prop provided, if editing, or if loading
                          disabled={!!accountId || !!packageId || fetching}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-black border-white/5 h-16 text-white rounded-xl focus:ring-primary focus:border-primary">
                              <SelectValue placeholder={t("selectClient")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                            {accounts.map((acc) => (
                              <SelectItem 
                                key={acc.id} 
                                value={acc.id} 
                                className="focus:bg-primary focus:text-black font-bold uppercase text-[10px] tracking-widest cursor-pointer"
                              >
                                {acc.account_label}
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
                          {/* <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                            {courses.map(c => (
                              <SelectItem key={c.id} value={c.id} className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent> */}
                          <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                            {filteredCourses.map((c) => (
                              <SelectItem 
                                key={c.id} 
                                value={c.id} 
                                className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer"
                              >
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* DISCOUNT AND STATUS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={control}
                    name="is_discounted"
                    render={({ field }) => {
                      
                      //const selectedCourse = courses.find(c => c.id === form.watch("course_id"));
                      //const hasDiscount = !!selectedCourse?.discounted_price;
                      const hasDiscount = true; // !!!!!!!!!

                      return (
                        <FormItem className="space-y-3">
                          {/* <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Offers</FormLabel> */}
                          {/* <div className="flex items-center space-x-3 h-16 rounded-xl border border-white/5 px-4 bg-white/5"> */}
                          <div className="flex items-center space-x-3 h-16 rounded-xl border border-white/5 px-4">
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
                            <FormLabel className={`text-[10px] font-black uppercase flex items-center gap-2 cursor-pointer ${hasDiscount && !isLocked ? "text-white" : "text-slate-600"}`}>
                                <Tag size={12} className={hasDiscount ? "text-primary" : ""} /> Знижка
                            </FormLabel>
                          </div>
                        </FormItem>
                      );
                    }}
                  />

                  {packageId ? (
                    <FormField
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          {/* <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Activity size={12} /> Status
                          </FormLabel> */}
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black border-white/5 h-16 text-white rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                              {PACKAGE_STATUSES.map(s => (
                                <SelectItem key={s} value={s} className="focus:bg-primary font-bold uppercase text-[10px] tracking-widest cursor-pointer">
                                  {tSt(s)} 
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="h-16 flex items-center px-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                       <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Новий Контракт</p>
                    </div>
                  )}
                </div>

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
                    {loading ? <Loader2 className="animate-spin" /> : (packageId ? t("save") : t("activate"))}
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