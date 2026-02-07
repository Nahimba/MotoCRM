"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Calendar, Clock, User, Plus, History, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function InstructorSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instructor, setInstructor] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])

  // Form State
  const [selectedEnrollment, setSelectedEnrollment] = useState("")
  const [hours, setHours] = useState("2")
  const [summary, setSummary] = useState("")

  async function loadInstructorData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error("Not authenticated")
      return
    }

    // 1. Get the instructor record linked to this profile
    const { data: inst } = await supabase
      .from('instructors')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    if (!inst) {
      setLoading(false)
      return // User is logged in but not linked to an instructor record
    }
    setInstructor(inst)

    // 2. Get active students (enrollments) assigned to this instructor
    const { data: enr } = await supabase
      .from('enrollments')
      .select('id, contract_price, remaining_hours, clients(name, last_name), courses(name)')
      .eq('instructor_id', inst.id)
      .eq('status', 'active')

    // 3. Get last 10 logs for this instructor
    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('*, enrollments(clients(name, last_name))')
      .eq('instructor_id', inst.id)
      .order('session_date', { ascending: false })
      .limit(10)

    setEnrollments(enr || [])
    setRecentLogs(logs || [])
    setLoading(false)
  }

  useEffect(() => { loadInstructorData() }, [])

  async function handleLogSession(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEnrollment) return toast.error("Select a student")
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('attendance_logs').insert([{
        enrollment_id: selectedEnrollment,
        instructor_id: instructor.id,
        hours_spent: parseFloat(hours),
        summary: summary,
        session_date: new Date().toISOString()
      }])

      if (error) throw error

      toast.success("Session logged successfully")
      setSummary("")
      loadInstructorData() // Refresh lists and hours
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>

  if (!instructor) return (
    <div className="p-20 text-center">
      <h2 className="text-white font-black uppercase italic text-2xl">Access Denied</h2>
      <p className="text-slate-500 mt-2">Your user profile is not linked to an Instructor record.</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* WELCOME HEADER */}
      <div className="bg-card border border-white/5 rounded-3xl p-8 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Instructor Dashboard</p>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
            Welcome, {instructor.full_name}
          </h1>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12">
          <Calendar size={200} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LOG NEW SESSION FORM */}
        <section className="bg-card border border-white/5 rounded-3xl p-8 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Plus size={20} strokeWidth={3} /></div>
            <h2 className="text-xl font-black text-white uppercase italic">Log Session</h2>
          </div>

          <form onSubmit={handleLogSession} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Student / Course</label>
              <select 
                required
                value={selectedEnrollment}
                onChange={(e) => setSelectedEnrollment(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 text-white outline-none focus:border-primary"
              >
                <option value="" className="bg-neutral-900">Select Student...</option>
                {enrollments.map(enr => (
                  <option key={enr.id} value={enr.id} className="bg-neutral-900">
                    {enr.clients?.name} {enr.clients?.last_name} — {enr.remaining_hours}h left
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Hours Spent</label>
                <select 
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 text-white outline-none focus:border-primary"
                >
                  <option value="1" className="bg-neutral-900">1 Hour</option>
                  <option value="1.5" className="bg-neutral-900">1.5 Hours</option>
                  <option value="2" className="bg-neutral-900">2 Hours</option>
                  <option value="3" className="bg-neutral-900">3 Hours</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[9px] text-slate-500 italic mb-2">Today's Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Session Summary</label>
              <textarea 
                placeholder="What did you work on today?"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 text-white outline-none focus:border-primary h-24 resize-none"
              />
            </div>

            <button 
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-black font-black uppercase rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
              Submit Session Log
            </button>
          </form>
        </section>

        {/* RECENT HISTORY */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg text-slate-400"><History size={20} /></div>
              <h2 className="text-xl font-black text-white uppercase italic">Your Recent Logs</h2>
            </div>
          </div>

          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-card border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:border-white/20 transition-all">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {log.enrollments?.clients?.name} {log.enrollments?.clients?.last_name}
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    {new Date(log.session_date).toLocaleDateString()} • {log.summary || 'No description'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-primary font-black text-lg">-{log.hours_spent}h</div>
                  <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Logged</div>
                </div>
              </div>
            ))}

            {recentLogs.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-3xl text-slate-600 font-bold uppercase text-xs">
                No sessions logged yet
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}