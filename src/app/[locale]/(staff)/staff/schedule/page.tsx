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
  eachHourOfInterval, setHours, startOfWeek, getDay, isSameDay
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
  const [showAllInstructors, setShowAllInstructors] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Responsive UI logic
  useEffect(() => {
    const handleResize = () => setHourHeight(window.innerWidth < 768 ? 60 : 80)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 2. Resolve Instructor Context
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      try {
        const { data } = await supabase
          .from('instructors')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle()
        
        if (data) setTargetInstructorId(data.id)
        if (profile.role === 'admin') setShowAllInstructors(true)
      } catch (err) { console.error("Identity Init Error:", err) }
    }
    init()
  }, [profile])

  // 3. Fetch Lessons
  const fetchLessons = useCallback(async () => {
    if (!targetInstructorId && !showAllInstructors) return
    
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)

    const start = (viewMode === 'day' ? startOfDay(selectedDate) : startOfWeek(selectedDate, { weekStartsOn: 1 })).toISOString()
    const end = addDays(new Date(start), viewMode === 'day' ? 1 : 7).toISOString()

    try {
      let query = supabase
        .from('view_schedule_lessons')
        .select('*')
        .gte('session_date', start)
        .lt('session_date', end)

      const isGlobalView = profile?.role === 'admin' && showAllInstructors;
      if (!isGlobalView && targetInstructorId) {
        query = query.eq('instructor_id', targetInstructorId)
      }

      const { data, error } = await query.abortSignal(controller.signal)
      if (error) throw error
      setLessons(data || [])
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, targetInstructorId, viewMode, showAllInstructors, profile])

  useEffect(() => { 
    fetchLessons() 
    return () => abortControllerRef.current?.abort()
  }, [fetchLessons])

  // 4. Overlap & Layout Logic
  const getLessonStyles = (lesson: any) => {
    const date = new Date(lesson.session_date);
    const duration = Number(lesson.duration) || 1;
    const top = (date.getHours() - 7) * hourHeight + (date.getMinutes() / 60) * hourHeight;
    
    const dayLessons = lessons.filter(l => isSameDay(new Date(l.session_date), date));
    
    const overlaps = dayLessons.filter(other => {
      if (other.id === lesson.id) return false;
      const s1 = new Date(lesson.session_date).getTime();
      const e1 = s1 + (duration * 3600000);
      const s2 = new Date(other.session_date).getTime();
      const e2 = s2 + ((Number(other.duration) || 1) * 3600000);
      return (s1 < e2 && e1 > s2);
    }).sort((a, b) => a.id.localeCompare(b.id));
  
    const hasOverlap = overlaps.length > 0;
    const isShifted = hasOverlap && overlaps.some(o => o.id < lesson.id);
  
    const baseStyles: any = {
      position: 'absolute',
      top: `${top}px`,
      height: `${duration * hourHeight - 2}px`,
      zIndex: isShifted ? 31 : 30,
      transition: 'all 0.2s ease-in-out',
    };
  
    if (viewMode === 'day') {
      return { 
        ...baseStyles, 
        width: hasOverlap ? '60%' : 'calc(100% - 8px)', 
        left: isShifted ? '35%' : '4px',
        boxShadow: hasOverlap ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)' : 'none'
      };
    }
  
    const dayIdx = (getDay(date) + 6) % 7;
    const colWidthPct = 100 / 7;
    const columnStartBase = dayIdx * colWidthPct;
  
    const finalWidthPct = hasOverlap ? (colWidthPct * 0.65) : (colWidthPct * 0.95);
    const shiftOffset = isShifted ? (colWidthPct * 0.3) : 0; 
    
    const finalLeft = `calc(${columnStartBase + shiftOffset}% + 2px)`;
  
    return {
      ...baseStyles,
      left: finalLeft,
      width: `${finalWidthPct}%`,
      borderLeft: hasOverlap ? '2px solid rgba(0,0,0,0.3)' : 'none',
    };
  };

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
      <header className="px-2 py-2 md:px-4 md:py-3 border-b border-white/10 bg-[#0A0A0A] z-[70] shrink-0">
        <div className="flex items-center w-full relative">
          <div className="flex items-center gap-1 z-10">
            <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/10">
              <button 
                onClick={() => setViewMode('day')} 
                className={`p-2 md:px-4 md:py-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'day' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}
              >
                <Maximize2 size={16}/>
                <span className="hidden md:inline ml-2 text-[10px] font-black uppercase">{t('day')}</span>
              </button>
              <button 
                onClick={() => setViewMode('week')} 
                className={`p-2 md:px-4 md:py-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'week' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}
              >
                <LayoutGrid size={16}/>
                <span className="hidden md:inline ml-2 text-[10px] font-black uppercase">{t('week')}</span>
              </button>
            </div>

            {profile?.role === 'admin' && (
              <button 
                onClick={() => setShowAllInstructors(!showAllInstructors)}
                className={`p-2 md:px-4 md:py-2 rounded-xl border transition-all flex items-center justify-center ${showAllInstructors ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/5 border-white/10 text-slate-500'}`}
              >
                {showAllInstructors ? <Users size={16}/> : <UserIcon size={16}/>}
                <span className="hidden md:inline ml-2 text-[10px] font-black uppercase">
                  {showAllInstructors ? t('allLessons') : t('myLessons')}
                </span>
              </button>
            )}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
            <button onClick={() => navigate('prev')} className="p-1 md:p-2 text-slate-400 hover:text-primary transition-colors">
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            
            <div className="flex flex-col items-center px-2 min-w-[65px] md:min-w-[120px]">
              <span className="text-[12px] md:text-[14px] font-black uppercase text-white whitespace-nowrap">
                {viewMode === 'day' ? format(selectedDate, 'dd MMM') : ''} 
              </span>
              {viewMode === 'week' && (
                <span className="text-[12px] md:text-[14px] font-black text-primary uppercase italic leading-none whitespace-nowrap">
                  {format(weekDays[0], 'dd/MM')}—{format(weekDays[6], 'dd/MM')}
                </span>
              )}
            </div>

            <button onClick={() => navigate('next')} className="p-1 md:p-2 text-slate-400 hover:text-primary transition-colors">
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="ml-auto z-10">
            <button 
              onClick={() => { setEditingLesson(null); setIsModalOpen(true); }} 
              className="bg-primary text-black h-9 w-9 md:h-11 md:w-auto md:px-6 rounded-xl font-black flex items-center justify-center shadow-lg shadow-primary/10 hover:bg-white transition-all"
            >
              <Plus size={20} strokeWidth={4} />
              <span className="hidden md:inline ml-2 text-xs uppercase">{t('addLesson')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto relative bg-[#050505] custom-scrollbar">
        <div className="relative" style={{ minWidth: viewMode === 'day' ? '100%' : '1200px' }}>
          {viewMode === 'week' && (
            <div className="flex ml-16 bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-[60]">
              {weekDays.map((day, i) => (
                <div key={i} className={`flex-1 py-3 text-center border-r border-white/5 ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
                  <p className="text-[9px] font-black uppercase text-slate-500">
                    <span className="md:hidden">{format(day, 'eeeeee', { locale: dateLocale })}</span>
                    <span className="hidden md:inline">{format(day, 'EEEE', { locale: dateLocale })}</span>
                  </p>
                  <p className={`text-sm font-black italic ${isSameDay(day, new Date()) ? 'text-primary' : 'text-white'}`}>
                    {format(day, 'dd.MM')}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="relative" style={{ height: `${HOURS.length * hourHeight}px` }}>
            <div className="absolute left-0 top-0 w-16 h-full border-r border-white/10 z-50 bg-black sticky left-0">
              {HOURS.map(h => (
                <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="pt-2 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums">
                  {format(h, 'HH:mm')}
                </div>
              ))}
            </div>

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

              <div className="absolute inset-0 z-30">
                {!loading && lessons.map(l => (
                  <LessonCard 
                    key={l.id} 
                    lesson={l}
                    viewMode={viewMode} 
                    hourHeight={hourHeight}
                    getStyles={() => getLessonStyles(l)}
                    onEdit={(lesson: any) => { setEditingLesson(lesson); setIsModalOpen(true); }} 
                  />
                ))}
              </div>
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
        // ВАЖНО: Передаем ID клиента и ID пакета для правильной загрузки досье
        onOpenDossier={(client) => setSelectedClient({ 
            id: client.id, 
            package_id: editingLesson?.course_package_id 
        })} 
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


  // 4. Layout Logic for overlapping lessons
  // This calculates the 'top', 'height', 'width', and 'left' offset for each card
  // const getLessonStyles = (lesson: any) => {
  //   const date = new Date(lesson.session_date)
  //   const duration = Number(lesson.duration) || 1
  //   const top = (date.getHours() - 7) * hourHeight + (date.getMinutes() / 60) * hourHeight
    
  //   // Find collisions on the same day
  //   const dayLessons = lessons.filter(l => isSameDay(new Date(l.session_date), date))
  //   const overlaps = dayLessons.filter(other => {
  //     if (other.id === lesson.id) return false
  //     const s1 = new Date(lesson.session_date).getTime()
  //     const e1 = s1 + (duration * 3600000)
  //     const s2 = new Date(other.session_date).getTime()
  //     const e2 = s2 + ((Number(other.duration) || 1) * 3600000)
  //     return (s1 < e2 && e1 > s2)
  //   }).sort((a, b) => a.id.localeCompare(b.id)) 

  //   const hasOverlap = overlaps.length > 0
  //   // If overlapped, determine if this card should be shifted right
  //   const isShifted = hasOverlap && overlaps.some(o => o.id < lesson.id)

  //   const baseStyles: any = {
  //     position: 'absolute',
  //     top: `${top}px`,
  //     height: `${duration * hourHeight}px`,
  //     zIndex: isShifted ? 31 : 30,
  //     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  //   }

  //   if (viewMode === 'day') {
  //     return { 
  //       ...baseStyles, 
  //       width: hasOverlap ? '48%' : 'calc(100% - 8px)',
  //       left: isShifted ? '50%' : '4px' 
  //     }
  //   }

  //   // Week View Column Logic
  //   const dayIdx = (getDay(date) + 6) % 7 // Align Monday as index 0
  //   const colWidthPct = 100 / 7
  //   const columnStartBase = dayIdx * colWidthPct
  //   const finalWidthPct = hasOverlap ? (colWidthPct * 0.47) : (colWidthPct * 0.96)
  //   const shiftOffset = isShifted ? (colWidthPct * 0.5) : 0
  //   const finalLeft = `calc(${columnStartBase + shiftOffset}% + 2px)`

  //   return {
  //     ...baseStyles,
  //     left: finalLeft,
  //     width: `${finalWidthPct}%`,
  //   }
  // }