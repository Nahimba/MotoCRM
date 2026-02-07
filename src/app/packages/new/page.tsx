"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

// 1. Define the schema strictly
const formSchema = z.object({
  account_id: z.string().min(1, "Select a rider"),
  total_hours: z.coerce.number().min(1),
  hourly_rate: z.coerce.number().min(0),
  discount_amount: z.coerce.number().min(0),
  amount_paid_today: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof formSchema>

export default function NewPackagePage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<{ id: string; full_name: string }[]>([])

  // 2. The Hook - forcing the resolver to match our FormValues exactly
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any, // Final bypass for the resolver mismatch
    defaultValues: {
      account_id: "",
      total_hours: 10,
      hourly_rate: 1500,
      discount_amount: 0,
      amount_paid_today: 0,
    },
  })

  // FIX 1: Cast the control to the specific type
  const control = form.control as unknown as Control<FormValues>;

  const totalHours = form.watch("total_hours")
  const rate = form.watch("hourly_rate")
  const discount = form.watch("discount_amount")
  
  // Guard against NaN during typing
  const totalValue = (Number(totalHours || 0) * Number(rate || 0)) - Number(discount || 0)

  useEffect(() => {
    async function getRiders() {
      const { data } = await supabase.from("accounts").select("id, full_name").order("full_name")
      if (data) setAccounts(data)
    }
    getRiders()
  }, [])

  async function onSubmit(values: FormValues) {
    try {
      const { error: enErr } = await supabase.from("enrollments").insert({
        account_id: values.account_id,
        service_id: "training_package",
        contract_price: values.hourly_rate,
        total_hours: values.total_hours,
        remaining_hours: values.total_hours,
        status: "active",
      })
      if (enErr) throw enErr

      if (values.amount_paid_today > 0) {
        await supabase.from("ledger_entries").insert({
          account_id: values.account_id,
          amount: values.amount_paid_today,
          entry_type: "payment",
          description: `Package Purchase: ${values.total_hours}h`
        })
      }
      toast.success("Package Activated!")
      router.push("/dashboard")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-orange-500">New Training Package</h1>
      
      <Form {...form}>
        {/* FIX 2: Cast onSubmit to any inside handleSubmit */}
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
          
          <FormField
            control={control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rider</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select rider" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="total_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="hourly_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate/hr</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="p-4 bg-slate-900 border rounded-lg">
            <p className="text-sm text-slate-400 font-bold uppercase tracking-tighter">Total Price</p>
            <div className="text-2xl font-bold text-orange-500">{totalValue.toLocaleString()} UAH</div>
          </div>

          <FormField
            control={control}
            name="amount_paid_today"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Received Today</FormLabel>
                <FormControl><Input type="number" className="border-green-600/50" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 font-bold py-6">
            Activate Package 🏁
          </Button>
        </form>
      </Form>
    </div>
  )
}