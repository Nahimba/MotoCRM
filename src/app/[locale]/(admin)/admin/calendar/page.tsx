"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus } from "lucide-react"

// Updated Types to handle Supabase's nested join returns
type Client = { id: string; name: string }
type Profile = { id: string; full_name: string | null; name?: string | null }

type PackageRow = {
  id: string
  client_id: string
  total_hours: number
  lessons?: { hours_deducted: number }[]
}

type LessonRow = {
  id: string
  package_id: string
  lesson_date: string
  hours_deducted: number
  staff_id: string | null
  packages: { 
    client_id: string; 
    clients: { name: string } | null 
  } | null 
  profiles: { full_name: string | null } | null
}

function formatDateForSupabase(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function packageRemainingHours(pkg: PackageRow): number {
  const total = pkg.total_hours ?? 0
  const used = (pkg.lessons ?? []).reduce((s, l) => s + (l.hours_deducted ?? 0), 0)
  return Math.max(0, total - used)
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [lessons, setLessons] = useState<LessonRow[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [selectedPackageId, setSelectedPackageId] = useState<string>("")
  const [hoursSpent, setHoursSpent] = useState(2)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")

  const fetchLessonsForDate = useCallback(async (date: Date) => {
    const dateStr = formatDateForSupabase(date)
    setLoadingLessons(true)
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select(`
          id,
          package_id,
          lesson_date,
          hours_deducted,
          staff_id,
          packages ( client_id, clients ( name ) ),
          profiles ( full_name )
        `)
        .eq("lesson_date", dateStr)
        .order("id")

      if (error) throw error
      
      // FIX: Conversion through unknown to satisfy the TS compiler mismatch
      const formattedData = (data as unknown) as LessonRow[]
      setLessons(formattedData ?? [])
    } catch (e) {
      console.error("Fetch error:", e)
      setLessons([])
    } finally {
      setLoadingLessons(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDate) fetchLessonsForDate(selectedDate)
    else setLessons([])
  }, [selectedDate, fetchLessonsForDate])

  useEffect(() => {
    async function loadInitialData() {
      const [cRes, pRes, profRes] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("packages").select("id, client_id, total_hours, lessons(hours_deducted)"),
        supabase.from("profiles").select("id, full_name"),
      ])
      
      if (!cRes.error) setClients(cRes.data ?? [])
      if (!pRes.error) setPackages((pRes.data as unknown as PackageRow[]) ?? [])
      if (!profRes.error) setProfiles(profRes.data ?? [])
    }
    loadInitialData()
  }, [])
  

  const clientPackages = packages.filter((p) => p.client_id === selectedClientId)
  const selectedPackage = packages.find((p) => p.id === selectedPackageId)
  const remainingHours = selectedPackage ? packageRemainingHours(selectedPackage) : 0
  const overHours = hoursSpent > remainingHours && remainingHours >= 0

  function openAddLesson() {
    setSelectedClientId("")
    setSelectedPackageId("")
    setHoursSpent(2)
    setSelectedStaffId("")
    setAddDialogOpen(true)
  }

  // async function handleAddLesson() {
  //   if (!selectedDate || !selectedPackageId) return
    
  //   setSubmitting(true)
  //   try {
  //     const { error } = await supabase.from("lessons").insert({
  //       package_id: selectedPackageId,
  //       lesson_date: formatDateForSupabase(selectedDate),
  //       hours_deducted: hoursSpent,
  //       staff_id: selectedStaffId || null,
  //     })

  //     if (error) throw error
      
  //     toast.success("Lesson recorded successfully.")
  //     setAddDialogOpen(false)
  //     fetchLessonsForDate(selectedDate)
  //   } catch (e) {
  //     console.error(e)
  //     toast.error("Database error: Could not save lesson.")
  //   } finally {
  //     setSubmitting(false)
  //   }
  // }

  async function handleAddLesson() {
    if (!selectedDate || !selectedPackageId) {
      console.error("Missing Date or Package!");
      return;
    }
    
    // LOG THE DATA BEFORE SENDING
    console.log("Sending to DB:", {
      package_id: selectedPackageId,
      staff_id: selectedStaffId, // This should match 69473e33...
      hours: hoursSpent
    });
  
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lessons").insert({
        package_id: selectedPackageId,
        lesson_date: formatDateForSupabase(selectedDate),
        hours_deducted: hoursSpent,
        staff_id: selectedStaffId || null,
      });
  
      if (error) throw error;
      
      toast.success("Lesson recorded.");
      setAddDialogOpen(false);
      fetchLessonsForDate(selectedDate);
    } catch (e: any) {
      // THIS WILL NOW TELL US THE REAL REASON
      console.error("Database Error Detail:", e.message || e);
      toast.error(`Error: ${e.message || "Could not save"}`);
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = (p: Profile) => p.full_name ?? p.name ?? "Unknown Staff"

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Flight Schedule</h1>
          <p className="text-muted-foreground">Manage daily flight lessons and package deductions.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="rounded-lg border bg-card p-4 h-fit">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md"
          />
        </div>

        <div className="flex-1">
          {selectedDate ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-semibold">
                  Lessons for {selectedDate.toLocaleDateString()}
                </h2>
                <Button onClick={openAddLesson}>
                  <Plus className="mr-2 h-4 w-4" /> Add Lesson
                </Button>
              </div>

              {loadingLessons ? (
                <p className="py-10 text-center text-muted-foreground">Syncing with database...</p>
              ) : lessons.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center">
                  <p className="text-muted-foreground">No lessons scheduled for this date.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {lessons.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border p-4 bg-card shadow-sm">
                      <div>
                        <p className="font-medium text-primary">
                          {/* Handling the possibility of array or object returns */}
                          {(l.packages as any)?.clients?.name || "Unknown Client"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Instructor: {l.profiles?.full_name || "Unassigned"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{l.hours_deducted} Hours</p>
                        <p className="text-xs uppercase text-muted-foreground tracking-wider">Deducted</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-20 text-center">
              <p className="text-muted-foreground">Select a date from the calendar to view details.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Flight Lesson</DialogTitle>
            <DialogDescription>
              Select a client and their active package to deduct flight hours.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={(v) => {
                setSelectedClientId(v)
                setSelectedPackageId("")
              }}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <div className="grid gap-2">
                <Label>Active Package</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {clientPackages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        Remaining: {packageRemainingHours(p).toFixed(1)}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Lesson Duration (Hours)</Label>
              <Input
                type="number"
                step={0.5}
                value={hoursSpent}
                onChange={(e) => setHoursSpent(parseFloat(e.target.value) || 0)}
              />
              {overHours && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Warning: This exceeds the remaining package hours ({remainingHours.toFixed(1)}h).
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Instructor</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger><SelectValue placeholder="Assign staff" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{displayName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLesson} disabled={!selectedPackageId || submitting}>
              {submitting ? "Processing..." : "Confirm Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}