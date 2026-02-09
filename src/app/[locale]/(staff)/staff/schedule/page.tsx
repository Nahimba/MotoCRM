"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, ChevronRight, Plus, 
  Loader2, LayoutGrid, Maximize2, CalendarDays, Layers 
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

const HOURS = eachHourOfInterval({
  start: setHours(startOfDay(new Date()), 7),
  end: setHours(startOfDay(new Date()), 22)
})

type ViewMode = 'day' | 'week' | 'period'

export default function SchedulePage() {
  const t = useTranslations("Schedule")
  const locale = useLocale()
  const dateLocale = locale === "ru" ? ru : enUS

  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [hourHeight, setHourHeight] = useState(80) 

  useEffect(() => {
    const handleResize = () => {
      setHourHeight(window.innerWidth < 768 ? 60 : 80)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!profile) return
    const init = async () => {
      if (profile.role === 'instructor') {
        const { data } = await supabase.from('instructors').select('id').eq('profile_id', profile.id).single()
        if (data) setTargetInstructorId(data.id)
      } else {
        const { data } = await supabase.from('instructors').select('id, full_name')
        setInstructors(data || [])
        if (data?.length && !targetInstructorId) setTargetInstructorId(data[0].id)
      }
    }
    init()
  }, [profile])

  const fetchLessons = useCallback(async () => {
    if (!targetInstructorId) return
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

    const { data } = await supabase
      .from('lessons')
      .select(`
        id, course_package_id, instructor_id, hours_spent, session_date, summary, 
        course_packages(id, instructor_id, accounts(clients(name, last_name, phone, address)))
      `)
      .eq('instructor_id', targetInstructorId)
      .gte('session_date', start)
      .lt('session_date', end)

    setLessons(data || [])
    setLoading(false)
  }, [selectedDate, targetInstructorId, viewMode])

  useEffect(() => { fetchLessons() }, [fetchLessons])

  const getLessonStyles = (startTime: string, duration: number) => {
    const date = new Date(startTime)
    const top = (date.getHours() - 7) * hourHeight + (date.getMinutes() / 60) * hourHeight
    
    if (viewMode === 'day') {
      return { top: `${top}px`, height: `${duration * hourHeight}px`, left: '4px', right: '4px' }
    }

    const dayIdx = (getDay(date) + 6) % 7 
    const colWidth = 100 / 7
    return {
      top: `${top}px`,
      height: `${duration * hourHeight}px`,
      left: `calc(${dayIdx * colWidth}% + 2px)`,
      width: `calc(${colWidth}% - 4px)`,
    }
  }

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') return setSelectedDate(new Date())
    const amount = viewMode === 'day' ? 1 : 7
    setSelectedDate(prev => direction === 'next' ? addDays(prev, amount) : subDays(prev, amount))
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      <header className="px-4 py-3 md:px-6 md:py-5 border-b border-white/10 bg-[#0A0A0A] z-[70] shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
            <button onClick={() => setViewMode('day')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'day' ? 'bg-primary text-black' : 'text-slate-500'}`}>
              <Maximize2 size={14} className="inline mr-2"/> {t('day')}
            </button>
            <button onClick={() => setViewMode('week')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-primary text-black' : 'text-slate-500'}`}>
              <LayoutGrid size={14} className="inline mr-2"/> {t('week')}
            </button>
            <button onClick={() => setViewMode('period')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'period' ? 'bg-primary text-black' : 'text-slate-500'}`}>
              <Layers size={14} className="inline mr-2"/> Period
            </button>
          </div>

          <div className="flex items-center gap-3 order-3 md:order-2">
            <button onClick={() => navigate('today')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-primary hover:bg-white/10"><CalendarDays size={20} /></button>
            <div className="flex bg-white/5 rounded-2xl p-1.5 items-center border border-white/10">
              <button onClick={() => navigate('prev')} className="p-2 hover:text-primary"><ChevronLeft size={22} strokeWidth={3} /></button>
              <div className="px-4 flex flex-col items-center min-w-[120px]">
                <span className="text-xs font-black uppercase tracking-widest text-white">{viewMode === 'day' ? format(selectedDate, 'dd MMMM', { locale: dateLocale }) : t('weekView')}</span>
                {viewMode !== 'day' && <span className="text-[10px] font-bold text-primary uppercase mt-0.5">{format(startOfWeek(selectedDate, {weekStartsOn: 1}), 'dd.MM')} — {format(addDays(startOfWeek(selectedDate, {weekStartsOn: 1}), 6), 'dd.MM')}</span>}
              </div>
              <button onClick={() => navigate('next')} className="p-2 hover:text-primary"><ChevronRight size={22} strokeWidth={3} /></button>
            </div>
          </div>

          <button onClick={() => { setEditingLesson(null); setIsModalOpen(true); }} className="order-2 md:order-3 w-full md:w-auto bg-primary text-black px-8 py-3.5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-2xl">
            <Plus size={20} strokeWidth={4} /> {t('addLesson')}
          </button>
        </div>
      </header>

      {/* --- SCROLLABLE AREA --- */}
      <div className="flex-1 overflow-auto relative bg-[#050505]">
        <div 
          className="relative" 
          style={{ 
            minWidth: viewMode === 'day' ? '100%' : '1200px',
            height: `${HOURS.length * hourHeight}px` 
          }}
        >
          {/* 1. Timeline Column (Sticky) */}
          <div className="absolute left-0 top-0 w-16 h-full border-r border-white/10 z-50 bg-black/90 sticky left-0 shadow-lg">
            {HOURS.map(h => (
              <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="pt-2 text-center text-[10px] md:text-xs font-black text-slate-500 border-b border-white/5 tabular-nums">
                {format(h, 'HH:mm')}
              </div>
            ))}
          </div>

          {/* 2. Grid & Cards Container */}
          <div className="absolute left-16 top-0 right-0 h-full">
            {/* Background Grid */}
            <div className={`absolute inset-0 grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} pointer-events-none z-10`}>
              {Array.from({ length: viewMode === 'day' ? 1 : 7 }).map((_, i) => (
                <div key={i} className="border-r border-white/5 h-full">
                  {HOURS.map(h => (
                    <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="border-b border-white/5" />
                  ))}
                </div>
              ))}
            </div>

            {/* Lesson Cards Layer */}
            <div className="absolute inset-0 z-30">
              {!loading && lessons.map(l => (
                <LessonCard 
                  key={l.id} 
                  lesson={l} 
                  viewMode={viewMode === 'day' ? 'day' : 'week'} 
                  hourHeight={hourHeight}
                  getStyles={getLessonStyles} 
                  onEdit={(lesson: any) => { setEditingLesson(lesson); setIsModalOpen(true); }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddLessonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} instructorId={targetInstructorId} initialDate={selectedDate} onSuccess={fetchLessons} editLesson={editingLesson} existingLessons={lessons} />
    </div>
  )
}