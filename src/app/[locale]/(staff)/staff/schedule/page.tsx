"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  ChevronLeft, ChevronRight, Plus, 
  LayoutGrid, Maximize2, CalendarDays, 
  Users, User as UserIcon,
  ShieldAlert, Coffee, Palmtree, Calendar
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { 
  format, addDays, subDays, startOfDay, 
  eachHourOfInterval, setHours, startOfWeek, getDay, isSameDay,
  isBefore, isAfter, endOfDay, isWithinInterval, differenceInDays 
} from "date-fns"
import { uk,  enUS } from "date-fns/locale"
import { useTranslations, useLocale } from "next-intl"

// Sub-components
import { LessonCard } from "@/components/schedule/LessonCard"
import { AddLessonModal } from "@/components/schedule/AddLessonModal"
import { ClientProfileModal } from "@/components/staff/ClientProfileModal"
import { AddExceptionModal } from "@/components/schedule/AddExceptionModal"
import { WorkHoursModal } from "@/components/schedule/WorkHoursModal"


import { formatInTimeZone, toZonedTime } from 'date-fns-tz'


const HOURS = eachHourOfInterval({
  start: setHours(startOfDay(new Date()), 7),
  end: setHours(startOfDay(new Date()), 22)
})

type ViewMode = 'day' | 'week'

export default function SchedulePage() {

  // This prevents React from trying to calculate "today" or "local time" during the server-side render
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);


  const t = useTranslations("Schedule")
  const locale = useLocale()
  const dateLocale = locale === "ua" ? uk : enUS
  const { profile } = useAuth()
  
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [hourHeight, setHourHeight] = useState(80) 

  const [lessons, setLessons] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [targetInstructorId, setTargetInstructorId] = useState<string | null>(null)
  const [showAllInstructors, setShowAllInstructors] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)


  const TZ = 'Europe/Kyiv' // This would come from your settings/database


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
        const { data: allInstructors } = await supabase
          .from('instructors')
          .select('id, profile_id, profiles(first_name, last_name)')
        
        if (allInstructors) {
          setInstructors(allInstructors)
          const matched = allInstructors.find((i: any) => i.profile_id === profile.id)
          if (matched) setTargetInstructorId(matched.id)
        }

        if (profile.role === 'admin') setShowAllInstructors(true)
      } catch (err) { console.error("Identity Init Error:", err) }
    }
    init()
  }, [profile])

  // useEffect(() => {
  //   if (viewMode === 'week' && showAllInstructors) {
  //     setShowAllInstructors(false);
  //   }
  // }, [viewMode]);
  
  useEffect(() => {
    if (viewMode === 'week' && showAllInstructors) {
      setShowAllInstructors(false);
      // Якщо targetInstructorId був порожнім, повертаємо на себе
      if (!targetInstructorId && profile) {
        const myId = instructors.find(i => i.profile_id === profile.id)?.id;
        if (myId) setTargetInstructorId(myId);
      }
    }
  }, [viewMode, showAllInstructors, instructors, profile, targetInstructorId]);



  const [workHours, setWorkHours] = useState<any[]>([])
  const [exceptions, setExceptions] = useState<any[]>([])
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false)
  const [editingException, setEditingException] = useState<any | null>(null)
  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState(false)

  // 2. Загрузка всех данных (Уроки, График, Исключения) через Promise.all
  const fetchAllData = useCallback(async () => {
    
    if (!targetInstructorId && !showAllInstructors) return
    setLoading(true)

    // const start = (viewMode === 'day' ? startOfDay(selectedDate) : startOfWeek(selectedDate, { weekStartsOn: 1 })).toISOString()
    // const end = addDays(new Date(start), viewMode === 'day' ? 1 : 7).toISOString()

    // Define the boundaries in Kyiv time
    const zonedStart = toZonedTime(selectedDate, TZ);
    const start = (viewMode === 'day' 
      ? startOfDay(zonedStart) 
      : startOfWeek(zonedStart, { weekStartsOn: 1 })
    );
    
    const end = addDays(start, viewMode === 'day' ? 1 : 7);

    // Use formatInTimeZone to get the exact UTC string for these Kyiv moments
    const startISO = formatInTimeZone(start, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const endISO = formatInTimeZone(end, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

    try {
      // 1. Создаем базовый запрос для уроков
      let lessonsQuery = supabase
        .from('view_schedule_lessons')
        .select('*')
        .gte('session_date', startISO)
        .lt('session_date', endISO)

      // 2. Условно добавляем фильтр по инструктору
      //const isGlobalView = profile?.role === 'admin' && showAllInstructors
      const isGlobalView = profile?.role === 'admin' && showAllInstructors && viewMode === 'day';
      if (!isGlobalView && targetInstructorId) {
        lessonsQuery = lessonsQuery.eq('instructor_id', targetInstructorId)
      }
      // if (!isGlobalView) {
      //   // Force filter by target instructor if not in team day-view
      //   if (targetInstructorId) {
      //     lessonsQuery = lessonsQuery.eq('instructor_id', targetInstructorId);
      //   } else {
      //     // If no instructor is selected and not global, return nothing
      //     setLessons([]);
      //     setLoading(false);
      //     return;
      //   }
      // }

      // 3. Выполняем все запросы параллельно
      const [lessonsRes, workHoursRes, exceptionsRes] = await Promise.all([
        lessonsQuery,
        supabase.from('instructor_work_hours')
          .select('*')
          .eq('instructor_id', targetInstructorId)
          .eq('is_active', true),
        supabase.from('instructor_exceptions')
          .select('*')
          .eq('instructor_id', targetInstructorId)
          //.or(`and(start_at.lte.${end},end_at.gte.${start})`) // Логіка перетину інтервалів
          .or(`and(start_at.lte.${endISO},end_at.gte.${startISO})`)
      ])

      if (lessonsRes.error) throw lessonsRes.error
      if (workHoursRes.error) throw workHoursRes.error
      if (exceptionsRes.error) throw exceptionsRes.error

      setLessons(lessonsRes.data || [])
      setWorkHours(workHoursRes.data || [])
      setExceptions(exceptionsRes.data || [])
    } catch (err: any) {
      console.error("Fetch All Data Error:", err.message || err);
    } finally {
      setLoading(false)
    }
  }, [selectedDate, targetInstructorId, viewMode, showAllInstructors, profile])

  useEffect(() => { fetchAllData() }, [fetchAllData])


// 3. Проверка рабочего времени
// const isNonWorkingHour = (time: Date) => {
//   if (showAllInstructors && viewMode === 'day') return false; // В режиме команды не затемняем
//   const dayOfWeek = getDay(time); 
//   const schedule = workHours.find(wh => wh.day_of_week === dayOfWeek);
//   if (!schedule) return true;

//   const currentTime = format(time, 'HH:mm:ss');
//   return currentTime < schedule.start_time || currentTime >= schedule.end_time;
// }
  const isNonWorkingHour = (time: Date, instructorId?: string | null) => {
    // Якщо ми не маємо ID інструктора (наприклад, у загальному режимі тижня), 
    // використовуємо targetInstructorId (ваш власний)
    const effectiveId = instructorId || targetInstructorId;
    if (!effectiveId) return false;

    const dayOfWeek = getDay(time); 
    // Шукаємо графік конкретного інструктора
    const schedule = workHours.find(wh => 
      wh.day_of_week === dayOfWeek && 
      wh.instructor_id === effectiveId
    );
    
    if (!schedule) return true;

    const currentTime = format(time, 'HH:mm:ss');
    return currentTime < schedule.start_time || currentTime >= schedule.end_time;
  }
  

  const getExceptionStyles = (ex: any, targetDate: Date) => {

    // const start = new Date(ex.start_at)
    // const end = new Date(ex.end_at)

    // Convert the UTC database time specifically to the Branch Time
    const start = toZonedTime(new Date(ex.start_at), TZ)
    const end = toZonedTime(new Date(ex.end_at), TZ)
    
    // Визначаємо початок і кінець блоку для конкретного дня
    // Якщо виняток почався раніше цього дня, малюємо з 7:00 (top: 0)
    const isStartedBefore = isBefore(start, startOfDay(targetDate))
    const isEndingAfter = isAfter(end, endOfDay(targetDate))

    const top = (ex.is_all_day || isStartedBefore) 
      ? 0 
      : Math.max(0, (start.getHours() - 7) * hourHeight + (start.getMinutes() / 60) * hourHeight)

    let height = hourHeight // дефолт
    if (ex.is_all_day || (isStartedBefore && isEndingAfter)) {
      height = HOURS.length * hourHeight
    } else {
      // Розрахунок для часткового блокування (наприклад, тільки ранок або тільки вечір)
      const displayStart = isStartedBefore ? setHours(startOfDay(targetDate), 7) : start
      const displayEnd = isEndingAfter ? setHours(startOfDay(targetDate), 22) : end
      const durationHours = (displayEnd.getTime() - displayStart.getTime()) / 3600000
      height = durationHours * hourHeight
    }

    // Розрахунок Left/Width залежно від режиму
    let left = '4px'
    let width = 'calc(100% - 8px)'

    if (viewMode === 'week') {
      const dayIdx = (getDay(targetDate) + 6) % 7
      const colWidthPct = 100 / 7
      left = `calc(${dayIdx * colWidthPct}% + 4px)`
      width = `calc(${colWidthPct}% - 8px)`
    } else if (isTeamView) {
      // Для режиму команди (якщо винятки фільтруються по інструктору)
      const insIdx = instructors.findIndex(i => i.id === ex.instructor_id)
      const colWidthPct = 100 / Math.max(1, instructors.length)
      left = `calc(${insIdx * colWidthPct}% + 4px)`
      width = `calc(${colWidthPct}% - 8px)`
    }

    return {
      position: 'absolute' as const,
      top: `${top}px`,
      left,
      width,
      height: `${height}px`,
      zIndex: 40,
    }
  }





  // 4. Overlap & Layout Logic
  const getLessonStyles = (lesson: any) => {

    // const date = new Date(lesson.session_date);
    // const duration = Number(lesson.duration) || 1;
    // const top = (date.getHours() - 7) * hourHeight + (date.getMinutes() / 60) * hourHeight;
    // const dayLessons = lessons.filter(l => isSameDay(new Date(l.session_date), date));


    const TZ = 'Europe/Kyiv';
    // Convert UTC session_date to a Kyiv Date object
    const date = toZonedTime(new Date(lesson.session_date), TZ);
    const duration = Number(lesson.duration) || 1;
    // Now getHours() returns the Kyiv hour regardless of where the Admin is
    const top = (date.getHours() - 7) * hourHeight + (date.getMinutes() / 60) * hourHeight;
    // When filtering dayLessons, compare using Zoned dates
    const dayLessons = lessons.filter(l => 
      isSameDay(toZonedTime(new Date(l.session_date), TZ), date)
    );
    
    // Determine overlaps only with lessons in the same column (same instructor if in multi-instructor view)
    const overlaps = dayLessons.filter(other => {
      if (other.id === lesson.id) return false;
      if (viewMode === 'day' && showAllInstructors && other.instructor_id !== lesson.instructor_id) return false;
      
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
      if (showAllInstructors && instructors.length > 0) {
        const insIdx = instructors.findIndex(i => i.id === lesson.instructor_id);
        const colWidthPct = 100 / instructors.length;
        const columnStartBase = Math.max(0, insIdx) * colWidthPct;
        
        const finalWidthPct = hasOverlap ? (colWidthPct * 0.65) : (colWidthPct * 0.95);
        const shiftOffset = isShifted ? (colWidthPct * 0.3) : 0; 
        const finalLeft = `calc(${columnStartBase + shiftOffset}% + 2px)`;

        return { 
          ...baseStyles, 
          width: `${finalWidthPct}%`, 
          left: finalLeft,
          borderLeft: hasOverlap ? '2px solid rgba(0,0,0,0.3)' : 'none',
          boxShadow: hasOverlap ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)' : 'none'
        };
      }

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

  const isTeamView = viewMode === 'day' && showAllInstructors;
  const gridMinWidth = isTeamView ? `${Math.max(1, instructors.length) * 200}px` : (viewMode === 'day' ? '100%' : '1200px');
  const gridColumns = isTeamView ? Math.max(1, instructors.length) : (viewMode === 'day' ? 1 : 7);


  // BLOCK RENDERING UNTIL MOUNTED
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-pulse text-zinc-700 font-black uppercase italic tracking-tighter">
          Оновлення даних...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      <header className="px-0 py-2 md:px-4 md:py-3 border-b border-white/10 bg-[#0A0A0A] z-[70] shrink-0">
        {/* Updated: Added flex-wrap and gap-2 for mobile, kept md:flex-nowrap to stay 1-line on desktop */}
        <div className="flex flex-wrap md:flex-nowrap items-center w-full relative px-2 md:px-0 gap-2">
          
          {/* View Mode Switcher */}
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

            {/* Instructor Selector */}
            {instructors.length > 0 && (
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-2 group hover:bg-white/10 transition-all cursor-pointer">
                <Users size={14} className="text-slate-500 mr-2" />
                <select
                  value={showAllInstructors && viewMode === 'day' ? 'all' : (targetInstructorId || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') { setShowAllInstructors(true); } 
                    else { setShowAllInstructors(false); setTargetInstructorId(val); }
                  }}
                  className="bg-transparent text-white text-[10px] font-black uppercase py-2 outline-none cursor-pointer appearance-none pr-4"
                >
                  {viewMode === 'day' && profile?.role === 'admin' && (
                    <option value="all" className="bg-[#0A0A0A] font-black text-primary">{t('allLessons')} (TEAM)</option>
                  )}
                  {instructors.map((ins) => (
                    <option key={ins.id} value={ins.id} className="bg-[#0A0A0A]">
                      {ins.profiles?.first_name} {ins.profiles?.last_name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 pointer-events-none text-slate-500">
                  <ChevronLeft size={10} className="-rotate-90" />
                </div>
              </div>
            )}
          </div>

          {/* Date Navigation - Updated: order-last or flex-1 to push around on mobile */}
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5 mx-auto md:mx-0">
            <button onClick={() => navigate('prev')} className="p-1 md:p-2 text-slate-400 hover:text-primary transition-colors">
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            <div className="flex flex-col items-center px-0 min-w-[65px] md:min-w-[120px]">
              <span className="text-[12px] md:text-[14px] font-black uppercase text-white">
                {viewMode === 'day' ? format(selectedDate, 'dd MMM') : ''} 
              </span>
              {viewMode === 'week' && (
                <span className="text-[12px] md:text-[14px] font-black text-primary uppercase italic leading-none">
                  {format(weekDays[0], 'dd.MM')}-{format(weekDays[6], 'dd.MM')}
                </span>
              )}
            </div>
            <button onClick={() => navigate('next')} className="p-1 md:p-2 text-slate-400 hover:text-primary transition-colors">
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>



          {/* Action Buttons - Updated: ml-auto md:ml-auto ensures it sticks right on desktop */}
          <div className="ml-auto flex gap-2">
            <button 
              onClick={() => { setEditingLesson(null); setIsModalOpen(true); }} 
              className="bg-primary text-black h-9 px-3 md:h-11 md:px-6 rounded-xl font-black flex items-center justify-center shadow-lg hover:bg-white transition-all"
            >
              <Plus size={18} strokeWidth={4} />
              <span className="hidden sm:inline ml-2 text-[10px] md:text-xs uppercase">{t('addLesson')}</span>
            </button>

            <button onClick={() => setIsExceptionModalOpen(true)} className="bg-white/5 text-slate-400 h-9 w-9 md:h-11 md:w-11 rounded-xl flex items-center justify-center border border-white/10">
              <ShieldAlert size={18} />
            </button>

            <button onClick={() => setIsWorkHoursModalOpen(true)} className="bg-white/5 text-slate-400 h-9 w-9 md:h-11 md:w-11 rounded-xl flex items-center justify-center border border-white/10">
              <Calendar size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto relative bg-[#050505] custom-scrollbar">
        <div className="relative" style={{ minWidth: gridMinWidth }}>
          {(viewMode === 'week' || isTeamView) && (
            <div className="flex ml-10 bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-[70]">
              {viewMode === 'week' ? (
                // weekDays.map((day, i) => (
                //   <div key={i} className={`flex-1 py-3 text-center border-r border-white/5 ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
                //     <p className="text-[9px] font-black uppercase text-slate-500">
                //       <span className="md:hidden">{format(day, 'eeeeee', { locale: dateLocale })}</span>
                //       <span className="hidden md:inline">{format(day, 'EEEE', { locale: dateLocale })}</span>
                //     </p>
                //     <p className={`text-sm font-black italic ${isSameDay(day, new Date()) ? 'text-primary' : 'text-white'}`}>
                //       {format(day, 'dd.MM')}
                //     </p>
                //   </div>
                // ))

                weekDays.map((day, i) => {
                  // FIX: Only check for "today" after mounting on the client
                  const isToday = isMounted && isSameDay(toZonedTime(day, TZ), toZonedTime(new Date(), TZ));
              
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 py-3 text-center border-r border-white/5 ${isToday ? 'bg-primary/5' : ''}`}
                    >
                      <p className="text-[9px] font-black uppercase text-slate-500">
                        <span className="md:hidden">{format(day, 'eeeeee', { locale: dateLocale })}</span>
                        <span className="hidden md:inline">{format(day, 'EEEE', { locale: dateLocale })}</span>
                      </p>
                      <p className={`text-sm font-black italic ${isToday ? 'text-primary' : 'text-white'}`}>
                        {format(day, 'dd.MM')}
                      </p>
                    </div>
                  );
                })
                
              ) : (
                instructors.map((ins) => (
                  <div key={ins.id} className="flex-1 py-3 text-center border-r border-white/5 bg-[#0D0D0D]">
                    <p className="text-[10px] font-black uppercase text-primary truncate px-2">
                      {ins.profiles?.first_name} {ins.profiles?.last_name}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="relative" style={{ height: `${HOURS.length * hourHeight}px` }}>
            {/* Часова шкала (Таймлайн) */}
            <div className="absolute left-0 top-0 w-10 h-full border-r border-white/10 z-[60] bg-black sticky left-0">
              {/* {HOURS.map(h => (
                <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="pt-2 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums">
                  {format(h, 'HH:mm')}
                </div>
              ))} */}
              {HOURS.map(h => (
                  <div 
                    key={h.toString()} 
                    style={{ height: `${hourHeight}px` }} 
                    className="pt-2 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums"
                  >
                    {format(h, 'HH:mm')}
                  </div>
                ))}
            </div>

            <div className="absolute left-10 top-0 right-0 h-full">
              <div 
                className="absolute inset-0 grid pointer-events-none z-10" 
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gridColumns }).map((_, i) => (
                  <div key={i} className="border-r border-white/5 h-full relative">
                     {HOURS.map(h => (
                      <div key={h.toString()} style={{ height: `${hourHeight}px` }} className="border-b border-white/[0.03]" />
                    ))}
                  </div>
                ))}
              </div>


                {/* Background Grid with Stripe Effect for Non-working hours */}
                {/* <div className={`absolute inset-0 grid ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'} pointer-events-none z-10`}>
                  {Array.from({ length: viewMode === 'day' ? 1 : 7 }).map((_, dayIdx) => (
                    <div key={dayIdx} className="border-r border-white/5 h-full">
                      {HOURS.map(h => {
                        const currentHourDate = viewMode === 'day' ? setHours(selectedDate, h.getHours()) : setHours(weekDays[dayIdx], h.getHours());
                        return (
                          <div 
                            key={h.toString()} 
                            style={{ height: `${hourHeight}px` }} 
                            className={`border-b border-white/[0.03] transition-colors ${isNonWorkingHour(currentHourDate) ? 'bg-white/[0.02] stripe-bg opacity-40' : ''}`} 
                          />
                        )
                      })}
                    </div>
                  ))}
                </div> */}

                <div 
                  className="absolute inset-0 grid pointer-events-none z-10" 
                  style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: gridColumns }).map((_, colIdx) => {
                    // Визначаємо інструктора для цієї колонки (тільки для Team View)
                    const colInstructorId = isTeamView ? instructors[colIdx]?.id : targetInstructorId;
                    // Визначаємо дату для цієї колонки (тільки для Week View)
                    const colDate = viewMode === 'week' ? weekDays[colIdx] : selectedDate;

                    return (
                      <div key={colIdx} className="border-r border-white/5 h-full relative">
                        {HOURS.map(h => {
                          // Очищаємо час від зайвих хвилин/секунд selectedDate
                          const currentHourDate = setHours(startOfDay(colDate), h.getHours());
                          
                          return (
                            <div 
                              key={h.toString()} 
                              style={{ height: `${hourHeight}px` }} 
                              className={`border-b border-white/[0.03] transition-colors ${
                                isNonWorkingHour(currentHourDate, colInstructorId) 
                                  ? 'bg-white/[0.02] stripe-bg opacity-40' 
                                  : ''
                              }`} 
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>



                {/* Exceptions / Blocked Slots */}
                {(viewMode === 'week' ? weekDays : [selectedDate]).map((currentDay) => (
                  <div key={currentDay.toString()}>
                    {/* {exceptions
                      .filter(ex => {
                        const start = new Date(ex.start_at)
                        const end = new Date(ex.end_at)
                        // Перевіряємо, чи поточний день потрапляє в інтервал відпустки
                        return isWithinInterval(currentDay, { 
                          start: startOfDay(start), 
                          end: endOfDay(end) 
                        })
                      }) */}
                    {exceptions
                      .filter(ex => {
                        // BUG FIX: Don't use new Date(ex.start_at). Use toZonedTime!
                        const start = toZonedTime(new Date(ex.start_at), TZ)
                        const end = toZonedTime(new Date(ex.end_at), TZ)
                        
                        // Now 'start' correctly reflects the date in Kyiv
                        return isWithinInterval(currentDay, { 
                          start: startOfDay(start), 
                          end: endOfDay(end) 
                        })
                      })
                      .map(ex => (
                        <div 
                          key={`${ex.id}-${currentDay}`} 
                          onClick={() => {
                            setEditingException(ex)
                            setIsExceptionModalOpen(true)
                          }}
                          style={getExceptionStyles(ex, currentDay)} 
                          className={`cursor-pointer rounded-lg border-l-4 flex flex-col p-2 overflow-hidden transition-all hover:brightness-110 z-40 ${
                            ex.type === 'vacation' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 
                            ex.type === 'sick' ? 'bg-red-500/10 border-red-500 text-red-400' : 
                            'bg-slate-500/10 border-slate-500 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {ex.type === 'vacation' ? <Palmtree size={12}/> : ex.type === 'busy' ? <Coffee size={12}/> : <ShieldAlert size={12}/>}
                            <span className="text-[10px] font-black uppercase truncate">{ex.title}</span>
                          </div>
                          
                          {/* Показуємо мітку "Весь день", якщо це all_day або триває довше 24 годин */}
                          {/* {(ex.is_all_day || differenceInDays(new Date(ex.end_at), new Date(ex.start_at)) > 0) && (
                            <span className="text-[9px] font-bold opacity-60 uppercase italic">Весь день</span>
                          )} */}
                          {/* Use zoned dates for the label check too */}
                          {(() => {
                            const zStart = toZonedTime(new Date(ex.start_at), TZ);
                            const zEnd = toZonedTime(new Date(ex.end_at), TZ);
                            
                            if (ex.is_all_day || differenceInDays(zEnd, zStart) > 0) {
                              return <span className="text-[9px] font-bold opacity-60 uppercase italic">Весь день</span>;
                            }
                            return null;
                          })()}
                        </div>
                      ))}
                  </div>
                ))}


                <div className="absolute inset-0 z-50 pointer-events-none">
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
        key={editingLesson?.id || 'new-lesson'}// 🚩 CRITICAL: fix for ui update. The Key Trick: When this ID changes, the entire modal REBOOTS
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingLesson(null); // 🚩 CRITICAL: Clear the lesson being edited
        }}
        instructorId={targetInstructorId} 
        instructors= {instructors}
        initialDate={selectedDate} 
        onSuccess={fetchAllData} 
        editLesson={editingLesson} 
        // ВАЖНО: Передаем ID клиента и ID пакета для правильной загрузки досье
        onOpenDossier={(client) => setSelectedClient({ 
          id: client.id, 
          package_id: editingLesson?.course_package_id })} 
      />

      <AddExceptionModal 
        key={editingException?.id || 'new-exception'}
        isOpen={isExceptionModalOpen}
        onClose={() => {
          setIsExceptionModalOpen(false);
          setEditingException(null); // Важливо скинути стан
        }}
        instructorId={targetInstructorId}
        initialDate={selectedDate}
        onSuccess={fetchAllData}
        editException={editingException} // Передаємо дані для редагування
      />

      <WorkHoursModal 
        key={targetInstructorId || 'work-hours'}
        isOpen={isWorkHoursModalOpen}
        onClose={() => setIsWorkHoursModalOpen(false)}
        instructorId={targetInstructorId}
        onSuccess={fetchAllData}
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







      {/* <AddLessonModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        instructorId={targetInstructorId} 
        initialDate={selectedDate} 
        onSuccess={fetchLessons} 
        editLesson={editingLesson} 
        // existingLessons={lessons} 
        // ВАЖНО: Передаем ID клиента и ID пакета для правильной загрузки досье
        onOpenDossier={(client) => setSelectedClient({ 
            id: client.id, 
            package_id: editingLesson?.course_package_id 
        })} 
      /> */}
      

  // // 3. Fetch Lessons
  // const fetchLessons = useCallback(async () => {
  //   if (!targetInstructorId && !showAllInstructors) return
    
  //   if (abortControllerRef.current) abortControllerRef.current.abort()
  //   const controller = new AbortController()
  //   abortControllerRef.current = controller

  //   setLoading(true)

  //   const start = (viewMode === 'day' ? startOfDay(selectedDate) : startOfWeek(selectedDate, { weekStartsOn: 1 })).toISOString()
  //   const end = addDays(new Date(start), viewMode === 'day' ? 1 : 7).toISOString()

  //   try {
  //     let query = supabase
  //       .from('view_schedule_lessons')
  //       .select('*')
  //       .gte('session_date', start)
  //       .lt('session_date', end)

  //     const isGlobalView = profile?.role === 'admin' && showAllInstructors;
  //     if (!isGlobalView && targetInstructorId) {
  //       query = query.eq('instructor_id', targetInstructorId)
  //     }

  //     const { data, error } = await query.abortSignal(controller.signal)
  //     if (error) throw error
  //     setLessons(data || [])
  //   } catch (err: any) {
  //     if (err.name !== 'AbortError') console.error("Fetch Error:", err)
  //   } finally {
  //     setLoading(false)
  //   }
  // }, [selectedDate, targetInstructorId, viewMode, showAllInstructors, profile])

  // useEffect(() => { 
  //   fetchLessons() 
  //   return () => abortControllerRef.current?.abort()
  // }, [fetchLessons])









// // 4. Стили для исключений (блокировок)
// const getExceptionStyles = (ex: any) => {
//   const start = new Date(ex.start_at);
//   const end = new Date(ex.end_at);
//   const durationHours = (end.getTime() - start.getTime()) / 3600000;
  
//   const top = (start.getHours() - 7) * hourHeight + (start.getMinutes() / 60) * hourHeight;
//   const dayIdx = (getDay(start) + 6) % 7;
//   const colWidthPct = 100 / 7;

//   return {
//     position: 'absolute' as const,
//     top: `${top}px`,
//     left: viewMode === 'day' ? '4px' : `calc(${dayIdx * colWidthPct}% + 4px)`,
//     width: viewMode === 'day' ? 'calc(100% - 8px)' : `calc(${colWidthPct}% - 8px)`,
//     height: ex.is_all_day ? `${HOURS.length * hourHeight}px` : `${durationHours * hourHeight}px`,
//     zIndex: 40,
//   }
// }


// const getExceptionStyles = (ex: any) => {
//   const start = new Date(ex.start_at);
//   const end = new Date(ex.end_at);
  
//   // Розрахунок позиції TOP
//   // Якщо "весь день", ставимо в 0 (початок сітки, тобто 7:00)
//   // Інакше розраховуємо відносно 7:00
//   const top = ex.is_all_day 
//     ? 0 
//     : (start.getHours() - 7) * hourHeight + (start.getMinutes() / 60) * hourHeight;

//   // Розрахунок висоти
//   // Якщо "весь день", висота = кількість годин у HOURS * висоту години
//   // Інакше розраховуємо тривалість між start та end
//   const durationHours = (end.getTime() - start.getTime()) / 3600000;
//   const height = ex.is_all_day 
//     ? HOURS.length * hourHeight 
//     : durationHours * hourHeight;

//   const dayIdx = (getDay(start) + 6) % 7;
//   const colWidthPct = 100 / 7;

//   return {
//     position: 'absolute' as const,
//     top: `${top}px`,
//     left: viewMode === 'day' ? '4px' : `calc(${dayIdx * colWidthPct}% + 4px)`,
//     width: viewMode === 'day' ? 'calc(100% - 8px)' : `calc(${colWidthPct}% - 8px)`,
//     height: `${height}px`,
//     zIndex: 40,
//   }
// }










                {/* Exceptions / Blocked Slots */}
                {/* {exceptions.map(ex => (
                  <div 
                    key={ex.id} 
                    onClick={() => {
                      setEditingException(ex);
                      setIsExceptionModalOpen(true);
                    }}
                    style={getExceptionStyles(ex)} 
                    className={`rounded-lg border-l-4 flex flex-col p-2 overflow-hidden 
                    ${
                      ex.type === 'vacation' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 
                      ex.type === 'sick' ? 'bg-red-500/10 border-red-500 text-red-400' : 
                      'bg-slate-500/10 border-slate-500 text-slate-400'
                    }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {ex.type === 'vacation' ? <Palmtree size={12}/> : ex.type === 'busy' ? <Coffee size={12}/> : <ShieldAlert size={12}/>}
                      <span className="text-[10px] font-black uppercase truncate">{ex.title}</span>
                    </div>
                    {ex.is_all_day && <span className="text-[9px] font-bold opacity-60 uppercase italic">Весь день</span>}
                  </div>
                ))} */}





  // // 1. Initial Data & Instructor List
  // useEffect(() => {
  //   const loadInstructors = async () => {
  //     const { data } = await supabase.from('instructors').select('id, full_name')
  //     if (data) {
  //       setInstructors(data)
  //       // Default to current user's instructor profile if available
  //       const current = data.find(ins => ins.id === profile?.id) || data[0]
  //       if (current && !targetInstructorId) setTargetInstructorId(current.id)
  //     }
  //   }
  //   loadInstructors()
  // }, [profile])



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















  
            {/* {profile?.role === 'admin' && (
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


            {(!showAllInstructors || viewMode === 'week') && instructors.length > 0 && (
              <select
                value={targetInstructorId || ''}
                onChange={(e) => setTargetInstructorId(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase rounded-xl px-3 py-2 outline-none hover:bg-white/10 transition-all cursor-pointer appearance-none"
              >
                {instructors.map((ins) => (
                  <option key={ins.id} value={ins.id} className="bg-[#0A0A0A]">
                    {ins.profiles?.first_name} {ins.profiles?.last_name}
                  </option>
                ))}
              </select>
            )} */}