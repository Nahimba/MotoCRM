"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, ChevronRight, Plus, 
  MapPin, Phone, Loader2, 
  X, Check, User, ShieldCheck,
  FileText, Trash2, Calendar as CalendarIcon,
  LayoutGrid, CalendarDays
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { 
  format, addDays, subDays, startOfDay, 
  eachHourOfInterval, setHours, isSameDay, 
  addMinutes, isWithinInterval, parseISO,
  startOfWeek, endOfWeek, eachDayOfInterval
} from "date-fns"
import { toast } from "sonner"

// --- TYPES ---
interface Lesson {
  id: string
  course_package_id: string
  instructor_id: string
  hours_spent: number
  summary: string
  session_date: string
  course_packages: {
    id: string
    instructor_id: string
    accounts: {
      clients: {
        name: string
        last_name: string
        phone: string
        address: string
      }
    }
  }
}

const HOURS = eachHourOfInterval({
  start: setHours(startOfDay(new Date()), 7),
  end: setHours(startOfDay(new Date()), 22)
})

export default function SchedulePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  const [instructors, setInstructors] = useState<{id: string, full_name: string}[]>([])

  // Calculate current visible days
  const visibleDays = useMemo(() => {
    if (viewMode === 'day') return [startOfDay(selectedDate)]
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday start
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [selectedDate, viewMode])

  // --- LOGIC: INITIAL FETCHES ---
  useEffect(() => {
    if (profile) {
      if (profile.role === 'instructor') {
        const fetchId = async () => {
          const { data } = await supabase.from('instructors').select('id').eq('profile_id', profile.id).single()
          if (data) setTargetInstructorId(data.id)
        }
        fetchId()
      } else if (profile.role === 'admin') {
        const fetchInst = async () => {
          const { data } = await supabase.from('instructors').select('id, full_name')
          setInstructors(data || [])
          if (data?.length && !targetInstructorId) setTargetInstructorId(data[0].id)
        }
        fetchInst()
      }
    }
  }, [profile])

  const fetchLessons = useCallback(async () => {
    if (!targetInstructorId) return
    setLoading(true)
    
    // Fetch range based on visible days
    const start = visibleDays[0].toISOString()
    const end = addDays(visibleDays[visibleDays.length - 1], 1).toISOString()

    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id, course_package_id, instructor_id, hours_spent, session_date, summary, 
        course_packages(id, instructor_id, accounts(clients(name, last_name, phone, address)))
      `)
      .eq('instructor_id', targetInstructorId)
      .gte('session_date', start)
      .lt('session_date', end)

    if (!error) setLessons(data as any)
    setLoading(false)
  }, [visibleDays, targetInstructorId])

  useEffect(() => { fetchLessons() }, [fetchLessons])

  const getLessonStyles = (startTime: string, duration: number) => {
    const date = new Date(startTime)
    const top = (date.getHours() - 7) * 80 + (date.getMinutes() / 60) * 80
    return { top: `${top}px`, height: `${duration * 80}px` }
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* --- HEADER --- */}
      <header className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080808]">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
              {format(selectedDate, 'MMMM')} <span className="text-primary">{format(selectedDate, 'yyyy')}</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
              {viewMode === 'day' ? format(selectedDate, 'EEEE, do') : `Week ${format(selectedDate, 'I')} — Overview`}
            </p>
          </div>
          
          <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5 items-center">
            <button onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'day' ? 1 : 7))} className="p-2 hover:text-primary transition-colors">
              <ChevronLeft size={20}/>
            </button>
            
            <div className="relative group px-4 border-x border-white/10 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2">
              <input 
                type="date" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => e.target.value && setSelectedDate(parseISO(e.target.value))}
              />
              <CalendarIcon size={14} className="text-primary" />
              <button className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, 'dd MMM')}
              </button>
            </div>

            <button onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'day' ? 1 : 7))} className="p-2 hover:text-primary transition-colors">
              <ChevronRight size={20}/>
            </button>
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'day' ? 'bg-primary text-black' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <LayoutGrid size={14} />
              <span className="text-[10px] font-black uppercase">Day</span>
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'week' ? 'bg-primary text-black' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <CalendarDays size={14} />
              <span className="text-[10px] font-black uppercase">Week</span>
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 bg-[#111] px-4 py-3 rounded-2xl border border-white/10 shadow-xl">
            <ShieldCheck size={16} className="text-primary" />
            <select className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-white min-w-[150px]" 
              onChange={(e) => setTargetInstructorId(e.target.value)} value={targetInstructorId || ""}>
              {instructors.map(inst => <option key={inst.id} value={inst.id} className="bg-neutral-900">{inst.full_name}</option>)}
            </select>
          </div>
        )}
      </header>

      {/* --- TIMELINE GRID --- */}
      <div className="flex-1 overflow-x-auto custom-scrollbar bg-[#050505] flex">
        {/* Time Sidebar */}
        <div className="sticky left-0 w-20 flex-shrink-0 border-r border-white/5 z-40 bg-black/80 backdrop-blur-md">
          <div className="h-12 border-b border-white/5" /> {/* Header spacer */}
          {HOURS.map((hour) => (
            <div key={hour.toString()} className="h-20 flex flex-col justify-start items-center pt-2">
              <span className="text-[11px] font-black text-slate-500">{format(hour, 'HH:mm')}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className={`flex flex-1 min-w-fit ${viewMode === 'week' ? 'divide-x divide-white/5' : ''}`}>
          {visibleDays.map((day) => (
            <div key={day.toISOString()} className={`relative flex-1 min-w-[280px] md:min-w-[320px] ${viewMode === 'day' ? 'w-full' : ''}`}>
              {/* Day Header */}
              <div className="h-12 flex items-center justify-center border-b border-white/5 sticky top-0 bg-black z-30">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isSameDay(day, new Date()) ? 'text-primary' : 'text-slate-500'}`}>
                  {format(day, 'EEE, MMM dd')}
                </span>
              </div>

              {/* Grid Background */}
              <div className="relative min-h-[1280px]">
                {HOURS.map((hour) => (
                  <div key={hour.toString()} className="h-20 border-b border-white/5 w-full relative">
                    <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
                  </div>
                ))}

                {/* Lessons for this specific day */}
                {lessons
                  .filter(lesson => isSameDay(parseISO(lesson.session_date), day))
                  .map((lesson) => {
                    const client = lesson.course_packages?.accounts?.clients
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => { setEditingLesson(lesson); setIsModalOpen(true); }}
                        style={getLessonStyles(lesson.session_date, lesson.hours_spent)}
                        className="absolute left-2 right-2 bg-[#111] border border-white/10 border-l-4 border-l-primary rounded-xl p-3 group hover:bg-[#161616] hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-2xl z-20"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black uppercase italic text-[11px] text-white group-hover:text-primary transition-colors truncate">
                              {client?.name} {client?.last_name || ''}
                            </h4>
                            <div className="flex flex-col gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <MapPin size={8} className="text-primary" />
                                <span className="text-[8px] font-black uppercase truncate">{client?.address || 'Field'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-primary/10 px-1.5 py-0.5 rounded text-[9px] font-black text-primary">
                            {lesson.hours_spent}H
                          </div>
                        </div>
                      </div>
                    )
                  })}

                {/* Live Indicator (only on the current day) */}
                {isSameDay(day, new Date()) && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-500/50 z-30 flex items-center pointer-events-none"
                    style={{ top: `${(new Date().getHours() - 7) * 80 + (new Date().getMinutes() / 60) * 80}px` }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] -ml-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ADD BUTTON --- */}
      <button 
        className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-black rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] hover:scale-110 active:scale-95 transition-all z-50 group"
        onClick={() => { setEditingLesson(null); setIsModalOpen(true); }}
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      <AddLessonModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingLesson(null); }} 
        instructorId={targetInstructorId} 
        initialDate={selectedDate} 
        onSuccess={fetchLessons}
        editLesson={editingLesson}
        existingLessons={lessons}
      />
    </div>
  )
}

// --- SUB-COMPONENT: MODAL ---
// (Remains exactly as your previous version - it handles the dates and grouping perfectly)
function AddLessonModal({ isOpen, onClose, instructorId, initialDate, onSuccess, editLesson, existingLessons }: any) {
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [lessonDate, setLessonDate] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState("12:00")
  const [duration, setDuration] = useState("2")
  const [summary, setSummary] = useState("")

  const selectedPkg = packages.find(p => p.id === selectedPackageId)

  useEffect(() => {
    if (isOpen) {
      const fetchPkgs = async () => {
        const { data } = await supabase.from('course_packages').select(`id, instructor_id, accounts(clients(name, last_name, phone, address))`).eq('status', 'active')
        setPackages(data || [])
      }
      fetchPkgs()

      if (editLesson) {
        const dateObj = parseISO(editLesson.session_date)
        setSelectedPackageId(editLesson.course_package_id)
        setLessonDate(format(dateObj, "yyyy-MM-dd"))
        setStartTime(format(dateObj, "HH:mm"))
        setDuration(editLesson.hours_spent.toString())
        setSummary(editLesson.summary || "")
      } else {
        setSelectedPackageId("")
        setLessonDate(format(initialDate, "yyyy-MM-dd"))
        setStartTime("12:00")
        setDuration("2")
        setSummary("")
      }
    }
  }, [isOpen, editLesson, initialDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackageId) return toast.error("Please select a student")
    setLoading(true)
    
    const [year, month, day] = lessonDate.split('-').map(Number)
    const [h, m] = startTime.split(':').map(Number)
    const finalDate = new Date(year, month - 1, day, h, m, 0, 0)

    const hasConflict = existingLessons.some((l: any) => {
      if (editLesson && l.id === editLesson.id) return false
      const s = parseISO(l.session_date); const e = addMinutes(s, l.hours_spent * 60)
      const ns = finalDate; const ne = addMinutes(ns, parseFloat(duration) * 60)
      return (isWithinInterval(ns, { start: s, end: addMinutes(e, -1) }) || isWithinInterval(addMinutes(ne, -1), { start: s, end: e }))
    })

    if (hasConflict) {
      setLoading(false)
      return toast.error("SCHEDULE CONFLICT: Slot already taken.")
    }

    const payload = {
      course_package_id: selectedPackageId,
      instructor_id: instructorId,
      hours_spent: parseFloat(duration),
      session_date: finalDate.toISOString(),
      summary
    }

    const { error } = editLesson 
      ? await supabase.from('lessons').update(payload).eq('id', editLesson.id)
      : await supabase.from('lessons').insert([payload])

    if (!error) {
      toast.success(editLesson ? "Lesson Updated" : "Lesson Logged Successfully")
      onSuccess(); onClose()
    } else toast.error(error.message)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm("Remove this lesson?")) return
    setLoading(true)
    const { error } = await supabase.from('lessons').delete().eq('id', editLesson.id)
    if (!error) { toast.success("Lesson Deleted"); onSuccess(); onClose(); }
    setLoading(false)
  }

  if (!isOpen) return null

  const myStudents = packages.filter(p => p.instructor_id === instructorId)
  const unassigned = packages.filter(p => !p.instructor_id)
  const otherStudents = packages.filter(p => p.instructor_id && p.instructor_id !== instructorId)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#141414]">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editLesson ? 'Edit Lesson' : 'Schedule Lesson'}</h2>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Lesson Date</label>
            <div className="relative">
              <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary transition-all" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
              <CalendarIcon size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Select Student</label>
            <div className="relative">
              <select required className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary appearance-none" value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                <option value="" className="bg-black text-slate-500">Choose student...</option>
                {myStudents.length > 0 && (
                  <optgroup label="⭐ MY ASSIGNED STUDENTS" className="bg-black text-primary font-bold">
                    {myStudents.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name || ''}</option>)}
                  </optgroup>
                )}
                {unassigned.length > 0 && (
                  <optgroup label="⚪ UNASSIGNED (FLOATING)" className="bg-black text-slate-500 font-bold">
                    {unassigned.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name || ''}</option>)}
                  </optgroup>
                )}
              </select>
              <User size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
          {selectedPkg && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[8px] font-black text-primary uppercase mb-1 flex items-center gap-1"><Phone size={8} /> Contact</p>
                <p className="text-xs font-bold">{selectedPkg.accounts?.clients?.phone || 'N/A'}</p>
              </div>
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[8px] font-black text-primary uppercase mb-1 flex items-center gap-1"><MapPin size={8} /> Pickup</p>
                <p className="text-xs font-bold truncate">{selectedPkg.accounts?.clients?.address || 'Standard'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Start Time</label>
              <input type="time" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Duration</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary appearance-none" value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="1" className="bg-black">1.0 Hour</option>
                <option value="1.5" className="bg-black">1.5 Hours</option>
                <option value="2" className="bg-black">2.0 Hours</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Lesson Notes</label>
            <div className="relative">
              <textarea placeholder="Topic or pickup details..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary min-h-[100px] resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} />
              <FileText size={16} className="absolute right-5 top-5 text-slate-500" />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            {editLesson && (
              <button type="button" onClick={handleDelete} className="flex-1 py-6 bg-red-500/10 text-red-500 font-black uppercase rounded-[2rem] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                <Trash2 size={20} />
              </button>
            )}
            <button type="submit" disabled={loading} className="flex-[3] py-6 bg-primary text-black font-black uppercase rounded-[2rem] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              {editLesson ? 'Update' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// "use client"

// import { useEffect, useState, useCallback } from "react"
// import { supabase } from "@/lib/supabase"
// import { 
//   ChevronLeft, ChevronRight, Plus, 
//   MapPin, Phone, Loader2, 
//   X, Check, User, ShieldCheck,
//   FileText, Trash2 
// } from "lucide-react"
// import { useAuth } from "@/context/AuthContext"
// import { 
//   format, addDays, subDays, startOfDay, 
//   eachHourOfInterval, setHours, isSameDay, 
//   addMinutes, isWithinInterval, parseISO 
// } from "date-fns"
// import { toast } from "sonner"

// // --- TYPES ---
// interface Lesson {
//   id: string
//   course_package_id: string
//   instructor_id: string
//   hours_spent: number
//   summary: string
//   session_date: string
//   course_packages: {
//     id: string
//     instructor_id: string
//     accounts: {
//       clients: {
//         name: string
//         last_name: string
//         phone: string
//         address: string
//       }
//     }
//   }
// }

// const HOURS = eachHourOfInterval({
//   start: setHours(startOfDay(new Date()), 7),
//   end: setHours(startOfDay(new Date()), 22)
// })

// export default function SchedulePage() {
//   const { profile } = useAuth()
//   const isAdmin = profile?.role === 'admin'
  
//   const [selectedDate, setSelectedDate] = useState(new Date())
//   const [lessons, setLessons] = useState<Lesson[]>([])
//   const [loading, setLoading] = useState(true)
//   const [isModalOpen, setIsModalOpen] = useState(false)
//   const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  
//   const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
//   const [instructors, setInstructors] = useState<{id: string, full_name: string}[]>([])

//   // --- LOGIC: INITIAL FETCHES ---
//   useEffect(() => {
//     if (profile) {
//       if (profile.role === 'instructor') {
//         const fetchId = async () => {
//           const { data } = await supabase.from('instructors').select('id').eq('profile_id', profile.id).single()
//           if (data) setTargetInstructorId(data.id)
//         }
//         fetchId()
//       } else if (profile.role === 'admin') {
//         const fetchInst = async () => {
//           const { data } = await supabase.from('instructors').select('id, full_name')
//           setInstructors(data || [])
//           if (data?.length && !targetInstructorId) setTargetInstructorId(data[0].id)
//         }
//         fetchInst()
//       }
//     }
//   }, [profile])

//   const fetchLessons = useCallback(async () => {
//     if (!targetInstructorId) return
//     setLoading(true)
//     const start = startOfDay(selectedDate).toISOString()
//     const end = addDays(startOfDay(selectedDate), 1).toISOString()

//     const { data, error } = await supabase
//       .from('lessons')
//       .select(`
//         id, course_package_id, instructor_id, hours_spent, session_date, summary, 
//         course_packages(id, instructor_id, accounts(clients(name, last_name, phone, address)))
//       `)
//       .eq('instructor_id', targetInstructorId)
//       .gte('session_date', start)
//       .lt('session_date', end)

//     if (!error) setLessons(data as any)
//     setLoading(false)
//   }, [selectedDate, targetInstructorId])

//   useEffect(() => { fetchLessons() }, [fetchLessons])

//   const getLessonStyles = (startTime: string, duration: number) => {
//     const date = new Date(startTime)
//     const top = (date.getHours() - 7) * 80 + (date.getMinutes() / 60) * 80
//     return { top: `${top}px`, height: `${duration * 80}px` }
//   }

//   return (
//     <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
//       {/* --- HEADER --- */}
//       <header className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080808]">
//         <div className="flex items-center gap-6">
//           <div className="flex flex-col">
//             <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
//               {format(selectedDate, 'MMMM')} <span className="text-primary">{format(selectedDate, 'yyyy')}</span>
//             </h1>
//             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
//               {isAdmin ? "Global Schedule Control" : "Personal Timeline"}
//             </p>
//           </div>
//           <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5">
//             <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:text-primary transition-colors"><ChevronLeft size={20}/></button>
//             <button onClick={() => setSelectedDate(new Date())} className="px-4 text-[10px] font-black uppercase tracking-widest border-x border-white/10 hover:bg-white/5">Today</button>
//             <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:text-primary transition-colors"><ChevronRight size={20}/></button>
//           </div>
//         </div>
//         {isAdmin && (
//           <div className="flex items-center gap-3 bg-[#111] px-4 py-3 rounded-2xl border border-white/10 shadow-xl">
//             <ShieldCheck size={16} className="text-primary" />
//             <select className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-white min-w-[150px]" 
//               onChange={(e) => setTargetInstructorId(e.target.value)} value={targetInstructorId || ""}>
//               {instructors.map(inst => <option key={inst.id} value={inst.id} className="bg-neutral-900">{inst.full_name}</option>)}
//             </select>
//           </div>
//         )}
//       </header>

//       {/* --- TIMELINE --- */}
//       <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#050505]">
//         <div className="absolute left-0 top-0 w-20 h-full border-r border-white/5 z-20 bg-black/50 backdrop-blur-md">
//           {HOURS.map((hour) => (
//             <div key={hour.toString()} className="h-20 flex flex-col justify-start items-center pt-2">
//               <span className="text-[11px] font-black text-slate-500">{format(hour, 'HH:mm')}</span>
//             </div>
//           ))}
//         </div>

//         <div className="ml-20 relative min-h-[1280px]">
//           {HOURS.map((hour) => (
//             <div key={hour.toString()} className="h-20 border-b border-white/5 w-full relative">
//               <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
//             </div>
//           ))}
          
//           {loading ? (
//             <div className="absolute inset-0 flex items-center justify-center bg-black/20">
//               <Loader2 className="animate-spin text-primary" size={40} />
//             </div>
//           ) : (
//             lessons.map((lesson) => {
//               const client = lesson.course_packages?.accounts?.clients
//               return (
//                 <div
//                   key={lesson.id}
//                   onClick={() => { setEditingLesson(lesson); setIsModalOpen(true); }}
//                   style={getLessonStyles(lesson.session_date, lesson.hours_spent)}
//                   className="absolute left-4 right-8 bg-[#111] border border-white/10 border-l-4 border-l-primary rounded-2xl p-4 group hover:bg-[#161616] hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-2xl"
//                 >
//                   <div className="flex justify-between items-start gap-4">
//                     <div className="flex-1 min-w-0 space-y-2">
//                       <div>
//                         <h4 className="font-black uppercase italic text-sm text-white group-hover:text-primary transition-colors truncate">
//                           {client?.name} {client?.last_name || ''}
//                         </h4>
//                         <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
//                           <div className="flex items-center gap-2 text-slate-500">
//                             <MapPin size={10} className="text-primary" />
//                             <span className="text-[9px] font-black uppercase truncate max-w-[150px]">{client?.address || 'Training Ground'}</span>
//                           </div>
//                           <div className="flex items-center gap-2 text-slate-500">
//                             <Phone size={10} className="text-primary" />
//                             <span className="text-[9px] font-black uppercase">{client?.phone || 'No Phone'}</span>
//                           </div>
//                         </div>
//                       </div>
//                       {lesson.summary && (
//                         <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5 max-w-full">
//                           <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-relaxed">
//                             <span className="text-primary/50 not-italic font-black mr-1 text-[8px] uppercase">Notes:</span>
//                             {lesson.summary}
//                           </p>
//                         </div>
//                       )}
//                     </div>
//                     <div className="bg-primary/10 px-2 py-1 rounded-lg text-[10px] font-black text-primary flex-shrink-0">
//                       {lesson.hours_spent}H
//                     </div>
//                   </div>
//                 </div>
//               )
//             })
//           )}

//           {/* --- LIVE TIME LINE --- */}
//           {isSameDay(selectedDate, new Date()) && (
//             <div className="absolute left-0 right-0 border-t-2 border-red-500/50 z-30 flex items-center pointer-events-none"
//               style={{ top: `${(new Date().getHours() - 7) * 80 + (new Date().getMinutes() / 60) * 80}px` }}>
//               <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] -ml-1.5" />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* --- ADD BUTTON --- */}
//       <button 
//         className="fixed bottom-10 right-10 w-20 h-20 bg-primary text-black rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] hover:scale-110 hover:rotate-90 active:scale-95 transition-all z-50 group"
//         onClick={() => { setEditingLesson(null); setIsModalOpen(true); }}
//       >
//         <Plus size={40} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
//       </button>

//       <AddLessonModal 
//         isOpen={isModalOpen} 
//         onClose={() => { setIsModalOpen(false); setEditingLesson(null); }} 
//         instructorId={targetInstructorId} 
//         selectedDate={selectedDate} 
//         onSuccess={fetchLessons}
//         editLesson={editingLesson}
//         existingLessons={lessons}
//       />
//     </div>
//   )
// }

// // --- SUB-COMPONENT: MODAL ---

// function AddLessonModal({ isOpen, onClose, instructorId, selectedDate, onSuccess, editLesson, existingLessons }: any) {
//   const [loading, setLoading] = useState(false)
//   const [packages, setPackages] = useState<any[]>([])
//   const [selectedPackageId, setSelectedPackageId] = useState("")
//   const [startTime, setStartTime] = useState("12:00")
//   const [duration, setDuration] = useState("2")
//   const [summary, setSummary] = useState("")

//   const selectedPkg = packages.find(p => p.id === selectedPackageId)

//   useEffect(() => {
//     if (isOpen) {
//       const fetchPkgs = async () => {
//         const { data } = await supabase.from('course_packages').select(`id, instructor_id, accounts(clients(name, last_name, phone, address))`).eq('status', 'active')
//         setPackages(data || [])
//       }
//       fetchPkgs()
//       if (editLesson) {
//         setSelectedPackageId(editLesson.course_package_id)
//         setStartTime(format(parseISO(editLesson.session_date), "HH:mm"))
//         setDuration(editLesson.hours_spent.toString())
//         setSummary(editLesson.summary || "")
//       } else {
//         setSelectedPackageId(""); setStartTime("12:00"); setDuration("2"); setSummary("")
//       }
//     }
//   }, [isOpen, editLesson])

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!selectedPackageId) return toast.error("Please select a student")

//     setLoading(true)
//     const [h, m] = startTime.split(':')
//     const d = new Date(selectedDate); d.setHours(parseInt(h), parseInt(m), 0, 0)

//     // Conflict Check
//     const hasConflict = existingLessons.some((l: any) => {
//       if (editLesson && l.id === editLesson.id) return false
//       const s = parseISO(l.session_date); const e = addMinutes(s, l.hours_spent * 60)
//       const ns = d; const ne = addMinutes(ns, parseFloat(duration) * 60)
//       return (isWithinInterval(ns, { start: s, end: addMinutes(e, -1) }) || isWithinInterval(addMinutes(ne, -1), { start: s, end: e }))
//     })

//     if (hasConflict) {
//       setLoading(false)
//       return toast.error("SCHEDULE CONFLICT: Slot already taken.")
//     }

//     const payload = {
//       course_package_id: selectedPackageId,
//       instructor_id: instructorId,
//       hours_spent: parseFloat(duration),
//       session_date: d.toISOString(),
//       summary
//     }

//     const { error } = editLesson 
//       ? await supabase.from('lessons').update(payload).eq('id', editLesson.id)
//       : await supabase.from('lessons').insert([payload])

//     if (!error) {
//       toast.success(editLesson ? "Lesson Updated" : "Lesson Logged Successfully")
//       onSuccess(); onClose()
//     } else toast.error(error.message)
//     setLoading(false)
//   }

//   const handleDelete = async () => {
//     if (!confirm("Remove this lesson?")) return
//     setLoading(true)
//     const { error } = await supabase.from('lessons').delete().eq('id', editLesson.id)
//     if (!error) { toast.success("Lesson Deleted"); onSuccess(); onClose(); }
//     setLoading(false)
//   }

//   if (!isOpen) return null

//   const myStudents = packages.filter(p => p.instructor_id === instructorId)
//   const unassigned = packages.filter(p => !p.instructor_id)
//   const otherStudents = packages.filter(p => p.instructor_id && p.instructor_id !== instructorId)

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
//       <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
//         <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#141414]">
//           <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editLesson ? 'Edit Lesson' : 'Schedule Lesson'}</h2>
//           <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-red-500 transition-colors"><X size={20} /></button>
//         </div>

//         <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
//           <div className="space-y-2">
//             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Select Student</label>
//             <div className="relative">
//               <select required className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary transition-all appearance-none" 
//                 value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
//                 <option value="" className="bg-black text-slate-500">Choose student...</option>
//                 {myStudents.length > 0 && (
//                   <optgroup label="⭐ MY ASSIGNED STUDENTS" className="bg-black text-primary font-bold">
//                     {myStudents.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name || ''}</option>)}
//                   </optgroup>
//                 )}
//                 {unassigned.length > 0 && (
//                   <optgroup label="⚪ UNASSIGNED (FLOATING)" className="bg-black text-slate-500 font-bold">
//                     {unassigned.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name || ''}</option>)}
//                   </optgroup>
//                 )}
//                 {otherStudents.length > 0 && (
//                   <optgroup label="🔄 OTHER INSTRUCTORS" className="bg-black text-orange-500/50 font-bold">
//                     {otherStudents.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name || ''}</option>)}
//                   </optgroup>
//                 )}
//               </select>
//               <User size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
//             </div>
//           </div>

//           {selectedPkg && (
//             <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
//               <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
//                 <p className="text-[8px] font-black text-primary uppercase mb-1 flex items-center gap-1"><Phone size={8} /> Contact</p>
//                 <p className="text-xs font-bold">{selectedPkg.accounts?.clients?.phone || 'N/A'}</p>
//               </div>
//               <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
//                 <p className="text-[8px] font-black text-primary uppercase mb-1 flex items-center gap-1"><MapPin size={8} /> Pickup</p>
//                 <p className="text-xs font-bold truncate">{selectedPkg.accounts?.clients?.address || 'Standard Location'}</p>
//               </div>
//             </div>
//           )}

//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Start Time</label>
//               <input type="time" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary" value={startTime} onChange={e => setStartTime(e.target.value)} />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Duration</label>
//               <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary appearance-none" value={duration} onChange={e => setDuration(e.target.value)}>
//                 <option value="1" className="bg-black">1.0 Hour</option>
//                 <option value="1.5" className="bg-black">1.5 Hours</option>
//                 <option value="2" className="bg-black">2.0 Hours</option>
//               </select>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Lesson Notes</label>
//             <div className="relative">
//               <textarea placeholder="Topic or pickup details..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary transition-all min-h-[100px] resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} />
//               <FileText size={16} className="absolute right-5 top-5 text-slate-500" />
//             </div>
//           </div>

//           <div className="flex gap-4 pt-4">
//             {editLesson && (
//               <button type="button" onClick={handleDelete} className="flex-1 py-6 bg-red-500/10 text-red-500 font-black uppercase rounded-[2rem] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
//                 <Trash2 size={20} />
//               </button>
//             )}
//             <button type="submit" disabled={loading} className="flex-[3] py-6 bg-primary text-black font-black uppercase rounded-[2rem] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
//               {loading ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
//               {editLesson ? 'Update' : 'Confirm'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   )
// }