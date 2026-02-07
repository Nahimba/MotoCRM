"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toCsvRows, downloadFile } from "@/lib/csv"
import { FileDown, TrendingUp, Wallet, Users, PlusCircle, Calendar } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({ income: 0, expenses: 0 })
  const [exporting, setExporting] = useState(false)

  // Fetch totals for the cards
  async function fetchFinancials() {
    const [payRes, expRes] = await Promise.all([
      supabase.from("payments").select("amount"),
      supabase.from("expenses").select("amount")
    ])
    
    const totalInc = payRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const totalExp = expRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
    setStats({ income: totalInc, expenses: totalExp })
  }

  useEffect(() => {
    fetchFinancials()
  }, [])

  // The missing function that was causing your error
  async function handleExportCsv() {
    setExporting(true)
    try {
      const [clientsRes, packagesRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("packages").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
      ])

      if (clientsRes.error) throw clientsRes.error

      const combined = [
        "CLIENTS", toCsvRows(clientsRes.data || []),
        "", "PACKAGES", toCsvRows(packagesRes.data || []),
        "", "PAYMENTS", toCsvRows(paymentsRes.data || []),
        "", "EXPENSES", toCsvRows(expensesRes.data || []),
      ].filter(Boolean).join("\r\n")

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")
      downloadFile(combined, `moto-crm-backup-${timestamp}.csv`)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExporting(false)
    }
  }

  const netProfit = stats.income - stats.expenses

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MotoCRM Dashboard</h1>
        <p className="text-muted-foreground">Flight school overview and financial tracking.</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.income.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-${stats.expenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">Net Profit</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${netProfit.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" className="h-24 flex-col gap-2" asChild>
          <Link href="/clients"><Users className="h-6 w-6" /> Clients</Link>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2" asChild>
          <Link href="/packages/new"><PlusCircle className="h-6 w-6" /> New Sale</Link>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2" asChild>
          <Link href="/calendar"><Calendar className="h-6 w-6" /> Calendar</Link>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2" asChild>
          <Link href="/expenses"><Wallet className="h-6 w-6" /> Expenses</Link>
        </Button>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleExportCsv} 
          disabled={exporting} 
          variant="secondary"
          size="sm"
        >
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? "Generating..." : "Full CSV Export"}
        </Button>
      </div>
    </div>
  )
}