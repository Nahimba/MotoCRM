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
import { ChevronLeft, Clock, Wallet, Bike } from "lucide-react"

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
  const [accounts, setAccounts] = useState<{ id: string; account_label: string }[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string; base_price: number; total_hours: number }[]>([])

  // FORCE: Cast resolver to any
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

  // FORCE: Double-cast control to silence TS
  const control = form.control as unknown as Control<FormValues>

  useEffect(() => {
    async function fetchData() {
      const [accRes, courRes] = await Promise.all([
        supabase.from("accounts").select("id, account_label").order("account_label"),
        supabase.from("courses").select("id, name, base_price, total_hours").eq("is_active", true)
      ])
      if (accRes.data) setAccounts(accRes.data)
      if (courRes.data) setCourses(courRes.data)
    }
    fetchData()
  }, [])

  const onCourseChange = (courseId: string) => {
    const selected = courses.find(c => c.id === courseId)
    if (selected) {
      form.setValue("total_hours", selected.total_hours)
      form.setValue("contract_price", selected.base_price)
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const { error: pkgErr } = await supabase.from("course_packages").insert({
        account_id: values.account_id,
        course_id: values.course_id,
        contract_price: values.contract_price,
        total_hours: values.total_hours,
        remaining_hours: values.total_hours,
        status: "active",
      })

      if (pkgErr) throw pkgErr

      if (values.amount_paid_today > 0) {
        await supabase.from("payments").insert({
          account_id: values.account_id,
          amount: values.amount_paid_today,
          entry_type: "payment",
          description: `Initial payment: ${values.total_hours}h`
        })
      }

      toast.success(t("success"))
      router.push("/staff/packages")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link href="/staff/packages" className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors text-xs font-bold uppercase tracking-widest">
        <ChevronLeft size={16} /> {t("back")}
      </Link>

      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
          {t("title")} <span className="text-primary">{t("subtitle")}</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t("description")}</p>
      </div>
      
      <Form {...(form as any)}>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 bg-[#080808] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("rider")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black border-white/10 h-12 text-white">
                        <SelectValue placeholder={t("selectRider")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.account_label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px] uppercase font-bold" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t("course")}</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); onCourseChange(v); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black border-white/10 h-12 text-white">
                        <SelectValue placeholder={t("selectCourse")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px] uppercase font-bold" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={control}
              name="total_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Clock size={12}/> {t("hours")}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-black border-white/10 h-12 text-white focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="contract_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">{t("price")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-black border-white/10 h-12 text-white focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("totalValue")}</p>
                <div className="text-3xl font-black italic text-primary uppercase tracking-tighter">
                   {Number(form.watch("contract_price") || 0).toLocaleString()} <span className="text-xs not-italic text-slate-500">UAH</span>
                </div>
             </div>
             <Bike className="opacity-10 text-white" size={40} />
          </div>

          <FormField
            control={control}
            name="amount_paid_today"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                  <Wallet size={12}/> {t("paymentToday")}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    className="bg-black border-primary/30 h-14 text-lg font-black italic text-primary focus:ring-1 focus:ring-primary" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full bg-primary text-black font-black uppercase py-8 rounded-2xl hover:bg-white hover:scale-[1.01] transition-all shadow-xl shadow-primary/10">
            {t("activate")} 🏁
          </Button>
        </form>
      </Form>
    </div>
  )
}