"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Calendar, Clock, User, Plus, History, CheckCircle2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

export default function InstructorSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instructor, setInstructor] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false) // Added Admin State
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

    const role = user.user_metadata?.role
    const isUserAdmin = role === 'admin'
    setIsAdmin(isUserAdmin)

    // 1. Get the instructor record linked to this profile
    const { data: inst } = await supabase
      .from('instructors')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    // 2. LOGIC: If Admin and no instructor record, create a "Virtual Admin" instructor object
    if (!inst && !isUserAdmin) {
      setLoading(false)
      return 
    }

    const currentInstructor = inst || { id: null, full_name: "Administrator" }
    setInstructor(currentInstructor)

    // 3. Get Students (Enrollments)
    // If Admin: Get ALL active. If Instructor: Get only ASSIGNED.
    let enrQuery = supabase
    .from('enrollments')
    .select(`
      id, 
      remaining_hours, 
      clients(name, last_name), 
      courses(name)
    `)
    .eq('status', 'active')

    if (!isUserAdmin) {
      enrQuery = enrQuery.eq('instructor_id', inst.id)
    }

    const { data: enr } = await enrQuery

    // 4. Get Logs
    // If Admin: Get last 20 from everyone. If Instructor: Get last 10 from self.
    let logsQuery = supabase
    .from('attendance_logs')
    .select(`
      *, 
      enrollments(
        clients(name, last_name)
      )
    `)
    .order('session_date', { ascending: false })

    if (!isUserAdmin) {
      logsQuery = logsQuery.eq('instructor_id', inst.id).limit(10)
    } else {
      logsQuery = logsQuery.limit(20)
    }

    const { data: logs } = await logsQuery

    setEnrollments(enr || [])
    setRecentLogs(logs || [])
    setLoading(false)
  }

  useEffect(() => { loadInstructorData() }, [])

  async function handleLogSession(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEnrollment) return toast.error("Select a student")
    
    // Admins need a valid instructor_id to log a session. 
    // They should select an instructor first or we use their linked ID.
    if (!instructor?.id) {
        return toast.error("Admin: You must be linked to an Instructor record to log hours.")
    }

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
      loadInstructorData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-20 flex justify-center h-screen items-center bg-black"><Loader2 className="animate-spin text-primary" size={40} /></div>

  if (!instructor && !isAdmin) return (
    <div className="p-20 text-center h-screen flex flex-col items-center justify-center bg-black">
      <ShieldAlert className="text-red-500 mb-4" size={48} />
      <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Access Denied</h2>
      <p className="text-slate-500 mt-2 max-w-sm uppercase text-[10px] font-bold tracking-widest">Your user profile is not linked to an Instructor record or Admin privileges.</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* WELCOME HEADER */}
      <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">
            {isAdmin ? "Flight Command / Admin View" : "Instructor Dashboard"}
          </p>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
            Welcome, {instructor?.full_name || 'Admin'}
          </h1>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12">
          <Calendar size={240} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LOG NEW SESSION FORM */}
        <section className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 h-fit">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Plus size={20} strokeWidth={3} /></div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Log Session</h2>
          </div>

          <form onSubmit={handleLogSession} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Select Student Deployment</label>
              <select 
                required
                value={selectedEnrollment}
                onChange={(e) => setSelectedEnrollment(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mt-2 text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-neutral-900">Choose Active Enrollment...</option>
                {enrollments.map(enr => (
                  <option key={enr.id} value={enr.id} className="bg-neutral-900">
                    {enr.clients?.full_name} — {enr.remaining_hours}h REMAINING
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Block Duration</label>
                <select 
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mt-2 text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  <option value="1" className="bg-neutral-900">1.0 Hour</option>
                  <option value="1.5" className="bg-neutral-900">1.5 Hours</option>
                  <option value="2" className="bg-neutral-900">2.0 Hours</option>
                  <option value="3" className="bg-neutral-900">3.0 Hours</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-4 italic px-2">Timestamp: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Training Briefing</label>
              <textarea 
                placeholder="Briefly describe the training maneuvers..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mt-2 text-white outline-none focus:border-primary h-32 resize-none transition-all"
              />
            </div>

            <button 
              disabled={isSubmitting || (isAdmin && !instructor?.id)}
              className="w-full py-5 bg-primary text-black font-black uppercase rounded-2xl flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-95 disabled:opacity-20"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
              Authorize & Log Session
            </button>
            {isAdmin && !instructor?.id && (
              <p className="text-[8px] text-center text-red-500 font-black uppercase mt-2 tracking-tighter">Linking to instructor record required to log sessions</p>
            )}
          </form>
        </section>

        {/* RECENT HISTORY */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <div className="p-3 bg-white/5 rounded-2xl text-slate-400"><History size={20} /></div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
              {isAdmin ? "Global Logs" : "My Recent Logs"}
            </h2>
          </div>

          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex justify-between items-center group hover:border-primary/30 transition-all border-l-4 border-l-transparent hover:border-l-primary">
                <div>
                  <h4 className="font-black text-white text-lg italic uppercase tracking-tight leading-none mb-1">
                    {log.enrollments?.clients?.full_name}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    {new Date(log.session_date).toLocaleDateString()} • {log.summary || 'Routine Training'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-primary font-black text-2xl tracking-tighter">-{log.hours_spent}H</div>
                  <div className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Confirmed</div>
                </div>
              </div>
            ))}

            {recentLogs.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2.5rem] text-slate-600 font-black uppercase text-[10px] tracking-widest">
                No active session data found
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}