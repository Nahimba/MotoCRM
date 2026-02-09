"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, ChevronRight, Plus, 
  Loader2, LayoutGrid, Maximize2 
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

type ViewMode = 'day' | 'week'

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
    const top = (date.getHours() - 7) * 80 + (date.getMinutes() / 60) * 80
    
    if (viewMode === 'day') {
      return { top: `${top}px`, height: `${duration * 80}px`, left: '1rem', right: '2rem' }
    }

    const dayIdx = (getDay(date) + 6) % 7 
    const colWidth = 100 / 7
    return {
      top: `${top}px`,
      height: `${duration * 80}px`,
      left: `calc(${dayIdx * colWidth}% + 2px)`,
      width: `calc(${colWidth}% - 4px)`,
    }
  }

  const navigate = (direction: 'prev' | 'next') => {
    const amount = viewMode === 'day' ? 1 : 7
    setSelectedDate(prev => direction === 'next' ? addDays(prev, amount) : subDays(prev, amount))
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      <header className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-[#080808] gap-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              {format(selectedDate, t(viewMode === 'day' ? 'titleDay' : 'titleWeek'), { locale: dateLocale })}
            </h1>
            {viewMode === 'week' && (
              <p className="text-[10px] font-black text-primary uppercase">
                {t('weekOf', { date: format(startOfWeek(selectedDate, {weekStartsOn:1}), 'do MMM', { locale: dateLocale }) })}
              </p>
            )}
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setViewMode('day')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'day' ? 'bg-primary text-black' : 'text-slate-500'}`}
            >
              <Maximize2 size={12}/> {t('day')}
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'week' ? 'bg-primary text-black' : 'text-slate-500'}`}
            >
              <LayoutGrid size={12}/> {t('week')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 rounded-2xl p-1 items-center border border-white/5">
            <button onClick={() => navigate('prev')} className="p-2 hover:text-primary"><ChevronLeft /></button>
            <span className="px-4 text-[10px] font-black uppercase min-w-[80px] text-center">
              {viewMode === 'day' ? format(selectedDate, 'dd MMM', { locale: dateLocale }) : t('weekView')}
            </span>
            <button onClick={() => navigate('next')} className="p-2 hover:text-primary"><ChevronRight /></button>
          </div>
          
          {isAdmin && (
            <select 
              className="bg-[#111] border border-white/10 p-3 rounded-2xl text-[10px] font-black uppercase outline-none" 
              onChange={(e) => setTargetInstructorId(e.target.value)} 
              value={targetInstructorId || ""}
            >
              {instructors.map(inst => <option key={inst.id} value={inst.id} className="bg-black">{inst.full_name}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#050505]">
        <div className="absolute left-0 w-20 h-full border-r border-white/5 z-30 bg-black/80 backdrop-blur-sm">
          {HOURS.map(h => (
            <div key={h.toString()} className="h-20 pt-2 text-center text-[11px] font-black text-slate-500 border-b border-white/[0.02]">
              {format(h, 'HH:mm')}
            </div>
          ))}
        </div>
        
        <div className="ml-20 relative min-h-[1280px]">
          <div className={`absolute inset-0 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
            {Array.from({ length: viewMode === 'week' ? 7 : 1 }).map((_, i) => (
              <div key={i} className="border-r border-white/[0.03] relative h-full">
                {HOURS.map(h => <div key={h.toString()} className="h-20 border-b border-white/[0.03]" />)}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-50">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          ) : (
            lessons.map(l => (
              <LessonCard 
                key={l.id} 
                lesson={l} 
                viewMode={viewMode}
                getStyles={getLessonStyles} 
                onEdit={(lesson: any) => { setEditingLesson(lesson); setIsModalOpen(true); }} 
              />
            ))
          )}
        </div>
      </div>

      <button 
        className="fixed bottom-10 right-10 w-20 h-20 bg-primary rounded-3xl z-50 flex items-center justify-center text-black shadow-2xl hover:scale-110 transition-transform" 
        onClick={() => { setEditingLesson(null); setIsModalOpen(true); }}
      >
        <Plus size={40} strokeWidth={3} />
      </button>

      <AddLessonModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        instructorId={targetInstructorId} 
        initialDate={selectedDate} 
        onSuccess={fetchLessons}
        editLesson={editingLesson}
        existingLessons={lessons}
      />
    </div>
  )
}