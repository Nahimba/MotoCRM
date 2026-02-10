// http://localhost:3000/en/staff/packages/new

"use client"

import { useEffect, useState } from "react"
import { useRouter, Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { ChevronLeft, Clock, Wallet, ShieldCheck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

const formSchema = z.object({
  account_id: z.string().min(1, "Required"),
  course_id: z.string().min(1, "Required"),
  total_hours: z.coerce.number().min(1),
  contract_price: z.coerce.number().min(0),
  amount_paid_today: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof formSchema>

export default function NewPackagePage() {
  const router = useRouter()
  const t = useTranslations("NewPackage")
  const { user } = useAuth()
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
      const [accRes, courRes, instRes] = await Promise.all([
        supabase.from("accounts").select("id, account_label").order("account_label"),
        supabase.from("courses").select("id, name, base_price, total_hours").eq("is_active", true),
        // Get the internal instructor ID for the current logged-in user
        supabase.from("instructors").select("id").eq("profile_id", user?.id).single()
      ])
      
      if (accRes.data) setAccounts(accRes.data)
      if (courRes.data) setCourses(courRes.data)
      if (instRes.data) setInstructorId(instRes.data.id)
    }
    if (user?.id) fetchData()
  }, [user])

  const onCourseChange = (courseId: string) => {
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      form.setValue("total_hours", selected.total_hours)
      form.setValue("contract_price", selected.base_price)
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      // 1. Create the Package
      const { data: pkgData, error: pkgErr } = await supabase
        .from("course_packages")
        .insert({
          account_id: values.account_id,
          course_id: values.course_id,
          instructor_id: instructorId, // Link to the current instructor
          contract_price: values.contract_price,
          total_hours: values.total_hours,
          remaining_hours: values.total_hours,
          status: "active",
        })
        .select()
        .single()

      if (pkgErr) throw pkgErr

      // 2. Log initial payment if any
      if (values.amount_paid_today > 0) {
        const { error: payErr } = await supabase.from("payments").insert({
          account_id: values.account_id,
          amount: values.amount_paid_today,
          entry_type: "payment",
          description: `Initial payment for ${values.total_hours}h package`
        })
        if (payErr) console.error("Payment log failed", payErr)
      }

      toast.success(t("success"))
      router.push("/staff/packages")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/staff/packages" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary mb-12 transition-all text-[10px] font-black uppercase tracking-[0.3em]">
          <ChevronLeft size={14} /> {t("back")}
        </Link>

        <div className="mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none mb-2">
            {t("title")} <span className="text-primary">{t("subtitle")}</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">{t("description")}</p>
        </div>
        
        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={control}
                name="account_id"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("rider")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0A0A0A] border-white/5 h-16 text-white rounded-xl focus:ring-primary/20">
                          <SelectValue placeholder={t("selectRider")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id} className="focus:bg-primary focus:text-black font-bold uppercase text-[10px] tracking-widest">
                            {a.account_label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
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
                        <SelectTrigger className="bg-[#0A0A0A] border-white/5 h-16 text-white rounded-xl focus:ring-primary/20">
                          <SelectValue placeholder={t("selectCourse")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id} className="focus:bg-primary focus:text-black font-bold uppercase text-[10px] tracking-widest">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                  </FormItem>
                )}
              />
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
                      <Input type="number" {...field} className="bg-[#0A0A0A] border-white/5 h-16 text-white font-black text-lg focus:border-primary rounded-xl" />
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
                      <Input type="number" {...field} className="bg-[#0A0A0A] border-white/5 h-16 text-white font-black text-lg focus:border-primary rounded-xl" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Summary Box */}
            <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 flex justify-between items-center relative overflow-hidden group">
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] mb-2">{t("totalValue")}</p>
                  <div className="text-4xl font-black italic text-primary uppercase tracking-tighter">
                     {Number(form.watch("contract_price") || 0).toLocaleString()} <span className="text-xs not-italic text-primary/40 ml-2">UAH</span>
                  </div>
               </div>
               <ShieldCheck className="text-primary/10 group-hover:text-primary/20 transition-colors absolute -right-4 -bottom-4" size={120} />
            </div>

            <FormField
              control={control}
              name="amount_paid_today"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-[0.2em]">
                    <Wallet size={12}/> {t("paymentToday")}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      className="bg-black border-primary/30 h-20 text-2xl font-black italic text-primary focus:ring-1 focus:ring-primary rounded-2xl transition-all" 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-primary text-black font-black uppercase py-10 rounded-2xl hover:bg-white hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(var(--primary-rgb),0.15)] text-sm tracking-[0.3em]"
            >
              {t("activate")} 🏁
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}