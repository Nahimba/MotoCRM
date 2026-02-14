"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, ChevronRight, Plus, 
  LayoutGrid, Maximize2, CalendarDays,
  Users, User as UserIcon
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { 
  format, addDays, subDays, startOfDay, 
  eachHourOfInterval, setHours, startOfWeek, getDay
} from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { useTranslations, useLocale } from "next-intl"

// Sub-components
import { LessonCard } from "@/components/schedule/LessonCard"
import { AddLessonModal } from "@/components/schedule/AddLessonModal"
import { ClientProfileModal } from "@/components/staff/ClientProfileModal"

const HOURS = eachHourOfInterval({
  start: setHours(startOfDay(new Date()), 7),
  end: setHours(startOfDay(new Date()), 22)
})

type ViewMode = 'day' | 'week'

export default function SchedulePage() {
  const t = useTranslations("Schedule")
  const locale = useLocale()
  const dateLocale = locale === "ru" ? ru : enUS
  const { profile } = useAuth()
  
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [hourHeight, setHourHeight] = useState(80) 

  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  
  // NEW: Toggle to see all school lessons or just personal
  const [showAllInstructors, setShowAllInstructors] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => setHourHeight(window.innerWidth < 768 ? 60 : 80)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Resolve current user identity
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      try {
        // Query the instructor table using the user's profile ID
        const { data } = await supabase
          .from('instructors')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle()
        
        if (data) setTargetInstructorId(data.id)
        
        // Admins should see everyone by default
        if (profile.role === 'admin') setShowAllInstructors(true)
      } catch (err) { console.error("Identity Init Error:", err) }
    }
    init()
  }, [profile])

  const fetchLessons = useCallback(async () => {
    // We need at least an identity or to be in "Show All" mode
    if (!targetInstructorId && !showAllInstructors) return
    
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)

    let start, end;
    if (viewMode === 'day') {
      start = startOfDay(selectedDate).toISOString()
      end = addDays(startOfDay(selectedDate), 1).toISOString()
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      start = weekStart.toISOString()
      end = addDays(weekStart, 7).toISOString()
    }

    try {
      let query = supabase
        .from('view_schedule_lessons')
        .select('*')
        .gte('session_date', start)
        .lt('session_date', end)

      // FILTER LOGIC:
      // If NOT showing all, show lessons where I am either the TEACHER or the LEAD
      if (!showAllInstructors && targetInstructorId) {
        query = query.or(`instructor_id.eq.${targetInstructorId},lead_instructor_id.eq.${targetInstructorId}`)
      }

      const { data, error } = await query.abortSignal(controller.signal)

      if (error) throw error
      setLessons(data || [])
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, targetInstructorId, viewMode, showAllInstructors])

  useEffect(() => { 
    fetchLessons() 
    return () => abortControllerRef.current?.abort()
  }, [fetchLessons])

  const getLessonStyles = (startTime: string, duration: number, status: string) => {
    const date = new Date(startTime)
    const top = (date.getHours() - 7) * hourHeight + (date.getMinutes() / 60) * hourHeight
    
    const baseStyles: any = {
      position: 'absolute',
      top: `${top}px`,
      height: `${duration * hourHeight}px`,
      zIndex: status === 'cancelled' ? 20 : 30,
    }

    if (viewMode === 'day') {
      return { ...baseStyles, left: '4px', right: '4px' }
    }

    const dayIdx = (getDay(date) + 6) % 7
    const colWidth = 100 / 7
    return {
      ...baseStyles,
      left: `calc(${dayIdx * colWidth}% + 2px)`,
      width: `calc(${colWidth}% - 4px)`,
    }
  }

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') return setSelectedDate(new Date())
    const amount = viewMode === 'day' ? 1 : 7
    setSelectedDate(prev => direction === 'next' ? addDays(prev, amount) : subDays(prev, amount))
  }

  const weekDays = Array.from({ length: 7 }).map((_, i) => 
    addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i)
  )

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      <header className="px-4 py-3 border-b border-white/10 bg-[#0A0A0A] z-[70] shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          
          {/* VIEW TOGGLES */}
          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => setViewMode('day')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'day' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}>
                <Maximize2 size={14}/> {t('day')}
              </button>
              <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'week' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}>
                <LayoutGrid size={14}/> {t('week')}
              </button>
            </div>

            {/* NEW: ALL vs MINE Toggle */}
            <button 
              onClick={() => setShowAllInstructors(!showAllInstructors)}
              className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${showAllInstructors ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              {showAllInstructors ? <Users size={14}/> : <UserIcon size={14}/>}
              {showAllInstructors ? t('allInstructors') : t('myLessons')}
            </button>
          </div>

          {/* DATE NAVIGATION */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('today')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-primary hover:bg-primary hover:text-black transition-all">
              <CalendarDays size={20} />
            </button>
            <div className="flex bg-white/5 rounded-2xl p-1.5 items-center border border-white/10">
              <button onClick={() => navigate('prev')} className="p-2 hover:text-primary transition-colors"><ChevronLeft size={22} strokeWidth={3} /></button>
              <div className="px-4 flex flex-col items-center min-w-[160px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  {viewMode === 'day' ? format(selectedDate, 'EEEE, dd MMMM', { locale: dateLocale }) : t('weekView')}
                </span>
                {viewMode !== 'day' && (
                  <span className="text-[9px] font-black text-primary uppercase italic">
                    {format(weekDays[0], 'dd MMM')} — {format(weekDays[6], 'dd MMM')}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('next')} className="p-2 hover:text-primary transition-colors"><ChevronRight size={22} strokeWidth={3} /></button>
            </div>
          </div>

          <button 
            onClick={() => { setEditingLesson(null); setIsModalOpen(true); }} 
            className="w-full md:w-auto bg-primary text-black px-8 py-3.5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/10 hover:bg-white transition-all"
          >
            <Plus size={20} strokeWidth={4} /> {t('addLesson')}
          </button>
        </div>
      </header>

      {/* WEEK DAYS STICKY HEADER */}
      {viewMode === 'week' && (
        <div className="flex bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-[60] ml-16 overflow-hidden shrink-0">
          {weekDays.map((day, i) => (
            <div key={i} className={`flex-1 py-3 text-center border-r border-white/5 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/5' : ''}`}>
              <p className="text-[9px] font-black uppercase text-slate-500">{format(day, 'EEEE', { locale: dateLocale })}</p>
              <p className={`text-sm font-black italic ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary' : 'text-white'}`}>{format(day, 'dd.MM')}</p>
            </div>
          ))}
        </div>
      )}

      {/* CALENDAR GRID */}
      <div className="flex-1 overflow-auto relative bg-[#050505] custom-scrollbar">
        <div 
          className="relative" 
          style={{ 
            minWidth: viewMode === 'day' ? '100%' : '1200px',
            height: `${HOURS.length * hourHeight}px` 
          }}
        >
          {/* TIME COLUMN */}
          <div className="absolute left-0 top-0 w-16 h-full border-r border-white/10 z-50 bg-black sticky left-0">
            {HOURS.map(h => (
              <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="pt-2 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums">
                {format(h, 'HH:mm')}
              </div>
            ))}
          </div>

          {/* MAIN GRID AREA */}
          <div className="absolute left-16 top-0 right-0 h-full">
            <div className={`absolute inset-0 grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} pointer-events-none z-10`}>
              {Array.from({ length: viewMode === 'day' ? 1 : 7 }).map((_, i) => (
                <div key={i} className="border-r border-white/5 h-full relative">
                   {HOURS.map(h => (
                    <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="border-b border-white/[0.03]" />
                  ))}
                </div>
              ))}
            </div>

            {/* LESSON CARDS */}
            <div className="absolute inset-0 z-30">
              {!loading && lessons.map(l => (
                <LessonCard 
                  key={l.id} 
                  lesson={l} 
                  viewMode={viewMode} 
                  hourHeight={hourHeight}
                  getStyles={getLessonStyles} 
                  currentInstructorId={targetInstructorId}
                  onEdit={(lesson: any) => { setEditingLesson(lesson); setIsModalOpen(true); }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddLessonModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        instructorId={targetInstructorId} 
        initialDate={selectedDate} 
        onSuccess={fetchLessons} 
        editLesson={editingLesson} 
        existingLessons={lessons}
        onOpenDossier={(client) => setSelectedClient(client)}
      />

      {selectedClient && (
        <ClientProfileModal 
          client={selectedClient} 
          onClose={() => setSelectedClient(null)} 
        />
      )}
    </div>
  )
}