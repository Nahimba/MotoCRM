//http://localhost:3000/ru/staff/schedule

"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, ChevronRight, Plus, 
  LayoutGrid, Maximize2, CalendarDays 
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { 
  format, addDays, subDays, startOfDay, 
  eachHourOfInterval, setHours, startOfWeek, getDay
} from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { useTranslations, useLocale } from "next-intl"
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
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [hourHeight, setHourHeight] = useState(80) 

  // Data State
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Adaptive UI
  useEffect(() => {
    const handleResize = () => setHourHeight(window.innerWidth < 768 ? 60 : 80)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 2. Instructor Identity Logic
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      try {
        const { data } = await supabase
          .from('instructors')
          .select('id')
          .eq(profile.role === 'instructor' ? 'profile_id' : 'id', profile.id)
          .limit(1)
          .maybeSingle()
        
        if (data) setTargetInstructorId(data.id)
      } catch (err) { console.error("Identity Init Error:", err) }
    }
    init()
  }, [profile])

  // 3. Fetch Lessons from flattened DB VIEW
  const fetchLessons = useCallback(async () => {
    if (!targetInstructorId) return
    
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
      const { data, error } = await supabase
        .from('view_schedule_lessons') // strictly flattened view
        .select('*')
        .eq('instructor_id', targetInstructorId)
        .gte('session_date', start)
        .lt('session_date', end)
        .abortSignal(controller.signal)

      if (error) throw error
      setLessons(data || [])
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, targetInstructorId, viewMode])

  useEffect(() => { 
    fetchLessons() 
    return () => abortControllerRef.current?.abort()
  }, [fetchLessons])

  // 4. Grid Positioning (using duration strictly)
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
      {/* HEADER */}
      <header className="px-4 py-3 border-b border-white/10 bg-[#0A0A0A] z-[70] shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
            <button onClick={() => setViewMode('day')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${viewMode === 'day' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}>
              <Maximize2 size={14}/> {t('day')}
            </button>
            <button onClick={() => setViewMode('week')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${viewMode === 'week' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}>
              <LayoutGrid size={14}/> {t('week')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('today')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-primary hover:bg-primary hover:text-black transition-all active:scale-95">
              <CalendarDays size={20} />
            </button>
            <div className="flex bg-white/5 rounded-2xl p-1.5 items-center border border-white/10">
              <button onClick={() => navigate('prev')} className="p-2 hover:text-primary transition-colors"><ChevronLeft size={22} strokeWidth={3} /></button>
              <div className="px-4 flex flex-col items-center min-w-[160px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white text-center">
                  {viewMode === 'day' ? format(selectedDate, 'EEEE, dd MMMM', { locale: dateLocale }) : t('weekView')}
                </span>
                {viewMode !== 'day' && (
                  <span className="text-[9px] font-black text-primary uppercase mt-0.5 italic">
                    {format(weekDays[0], 'dd MMM')} — {format(weekDays[6], 'dd MMM')}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('next')} className="p-2 hover:text-primary transition-colors"><ChevronRight size={22} strokeWidth={3} /></button>
            </div>
          </div>

          <button 
            onClick={() => { setEditingLesson(null); setIsModalOpen(true); }} 
            className="w-full md:w-auto bg-primary text-black px-8 py-3.5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/10 active:scale-95 hover:bg-white transition-all"
          >
            <Plus size={20} strokeWidth={4} /> {t('addLesson')}
          </button>
        </div>
      </header>

      {/* COLUMN HEADERS FOR WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="flex bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-[60] ml-16 overflow-hidden shrink-0">
          {weekDays.map((day, i) => (
            <div key={i} className={`flex-1 py-3 text-center border-r border-white/5 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/5' : ''}`}>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">{format(day, 'EEEE', { locale: dateLocale })}</p>
              <p className={`text-sm font-black italic ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary' : 'text-white'}`}>{format(day, 'dd.MM')}</p>
            </div>
          ))}
        </div>
      )}

      {/* MAIN SCHEDULE AREA */}
      <div className="flex-1 overflow-auto relative bg-[#050505] custom-scrollbar">
        <div 
          className="relative" 
          style={{ 
            minWidth: viewMode === 'day' ? '100%' : '1200px',
            height: `${HOURS.length * hourHeight}px` 
          }}
        >
          {/* Timeline Column */}
          <div className="absolute left-0 top-0 w-16 h-full border-r border-white/10 z-50 bg-black sticky left-0 shadow-2xl">
            {HOURS.map(h => (
              <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="pt-2 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums">
                {format(h, 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Grid Content */}
          <div className="absolute left-16 top-0 right-0 h-full">
            {/* Background Grid Lines */}
            <div className={`absolute inset-0 grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} pointer-events-none z-10`}>
              {Array.from({ length: viewMode === 'day' ? 1 : 7 }).map((_, i) => (
                <div key={i} className="border-r border-white/5 h-full relative">
                   {HOURS.map(h => (
                    <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="border-b border-white/[0.03]" />
                  ))}
                </div>
              ))}
            </div>

            {/* Lesson Cards Container */}
            <div className="absolute inset-0 z-30">
              {!loading && lessons.map(l => (
                <LessonCard 
                  key={l.id} 
                  lesson={l} 
                  viewMode={viewMode} 
                  hourHeight={hourHeight}
                  getStyles={getLessonStyles} 
                  onEdit={(lesson: any) => { setEditingLesson(lesson); setIsModalOpen(true); }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
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