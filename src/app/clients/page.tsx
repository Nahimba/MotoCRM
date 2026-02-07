"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Plus } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  address: z.string().optional(),
})

type PaymentRow = { amount: number }
type LessonRow = { hours_deducted: number }
type PackageRow = {
  id: string
  base_price: number
  discount_amount: number
  total_hours: number
  payments?: PaymentRow[] | null
  lessons?: LessonRow[] | null
}

type ClientRow = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  created_at?: string
  packages?: PackageRow[] | null
}

function finalPrice(pkg: PackageRow) {
  return (pkg.base_price ?? 0) - (pkg.discount_amount ?? 0)
}

function clientBalance(client: ClientRow): number {
  const packages = client.packages ?? []
  const totalOwed = packages.reduce((sum, p) => sum + finalPrice(p), 0)
  const totalPaid = packages.reduce(
    (sum, p) => sum + (p.payments ?? []).reduce((s, pay) => s + (pay.amount ?? 0), 0),
    0
  )
  return totalOwed - totalPaid
}

function clientHours(client: ClientRow): number {
  const packages = client.packages ?? []
  const totalHours = packages.reduce((sum, p) => sum + (p.total_hours ?? 0), 0)
  const deducted = packages.reduce(
    (sum, p) =>
      sum + (p.lessons ?? []).reduce((s, l) => s + (l.hours_deducted ?? 0), 0),
    0
  )
  return totalHours - deducted
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          packages (
            id,
            base_price,
            discount_amount,
            total_hours,
            payments (amount),
            lessons (hours_deducted)
          )
        `
        )
        .order("created_at", { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { data, error } = await supabase.from("clients").insert([
        {
          name: values.name,
          email: values.email,   // This column exists now!
          phone: values.phone,
          address: values.address // This column exists now!
        }
      ]);
  
      if (error) throw error; // If RLS is blocking you, this will trigger
  
      form.reset();
      setDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      // TIP: Alert the actual error message so we can see it clearly
      alert("Database Error: " + (error.message || "RLS Policy Block"));
      console.error("Error adding client:", error);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the client information below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, City, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Save Client</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          No clients found. Add your first client to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const balance = clientBalance(client)
                const hours = clientHours(client)
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.address || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={balance > 0 ? "destructive" : "success"}
                      >
                        {balance > 0 ? "Owes " : "Paid "}
                        ${Math.abs(balance).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>{hours.toFixed(1)}</TableCell>
                    <TableCell>
                      {client.created_at
                        ? new Date(client.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
