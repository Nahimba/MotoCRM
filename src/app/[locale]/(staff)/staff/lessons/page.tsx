"use client"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Phone, MapPin, Contact2, Clock, Calendar } from "lucide-react"
import { format, startOfDay, endOfDay, eachHourOfInterval, setHours, getHours } from "date-fns"
import { useAuth } from "@/context/AuthContext"
import { ClientProfileModal } from "@/components/staff/ClientProfileModal"
import { useTranslations } from "next-intl"
import Link from "next/link"

const HOUR_HEIGHT = 100 

export default function StaffLandingPage() {
  const t = useTranslations("StaffDashboard")
  const { profile } = useAuth()
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const HOURS = useMemo(() => {
    if (lessons.length === 0) {
      return eachHourOfInterval({
        start: setHours(startOfDay(new Date()), 8),
        end: setHours(startOfDay(new Date()), 18)
      })
    }
    const startHours = lessons.map(l => getHours(new Date(l.session_date)))
    const minHour = Math.max(0, Math.min(...startHours) - 1)
    const maxHour = Math.min(23, Math.max(...startHours) + 3)

    return eachHourOfInterval({
      start: setHours(startOfDay(new Date()), minHour),
      end: setHours(startOfDay(new Date()), maxHour)
    })
  }, [lessons])

  const startHourOffset = HOURS.length > 0 ? getHours(HOURS[0]) : 7

  useEffect(() => {
    let isMounted = true
    if (!profile) return
    const initIdentity = async () => {
      try {
        let id = null
        if (profile.role === 'instructor') {
          const { data } = await supabase.from('instructors').select('id').eq('profile_id', profile.id).maybeSingle()
          id = data?.id
        } else if (profile.role === 'admin') {
          const { data } = await supabase.from('instructors').select('id').limit(1).maybeSingle()
          id = data?.id
        }
        if (isMounted && id) setInstructorId(id)
      } catch (err) { console.error(err) }
    }
    initIdentity()
    return () => { isMounted = false }
  }, [profile])

  const fetchTodayLessons = useCallback(async (id: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    setLoading(true)
    try {
      const { data, error } = await supabase
        // Используем облегченную вьюху
        .from('staff_today_schedule_view') 
        .select('*') // Вьюха должна включать course_package_id
        .eq('instructor_id', id)
        .gte('session_date', startOfDay(new Date()).toISOString())
        .lte('session_date', endOfDay(new Date()).toISOString())
        .order('session_date', { ascending: true })
        .abortSignal(controller.signal)
      if (!error) setLessons(data || [])
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (instructorId) fetchTodayLessons(instructorId)
    return () => abortControllerRef.current?.abort()
  }, [fetchTodayLessons, instructorId])

  const getLessonStyles = (startTime: string, status: string) => {
    const date = new Date(startTime)
    const top = (getHours(date) - startHourOffset) * HOUR_HEIGHT + (date.getMinutes() / 60) * HOUR_HEIGHT
    const statusColor = status === 'completed' ? '#10b981' : status === 'planned' ? '#3b82f6' : '#ef4444'

    return { 
      top: `${top}px`, 
      minHeight: '180px', 
      left: '12px', 
      right: '12px',
      position: 'absolute' as const,
      zIndex: 40,
      borderLeft: `4px solid ${statusColor}`
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">{t('title')}</h1>
          <p className="text-[12px] font-bold uppercase text-slate-400 tracking-[0.2em]">{format(new Date(), 'EEEE, dd MMMM')}</p>
        </div>
        <div className="bg-[#111] border border-white/10 px-5 py-2 rounded-xl text-center">
          <p className="text-xl font-black italic text-primary leading-none">{lessons.length}</p>
          <p className="text-[7px] font-black uppercase text-slate-500 mt-1">{t('assignments')}</p>
        </div>
      </div>

      <div className="relative overflow-y-auto bg-[#080808] rounded-[2rem] border border-white/5 h-[750px] shadow-2xl custom-scrollbar">
        {!loading && lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
              <Calendar className="text-slate-500" size={24} />
            </div>
            <h3 className="text-xl font-bold italic uppercase tracking-tight mb-2">{t('noLessonsToday')}</h3>
            <Link 
              href="/en/staff/schedule"
              className="bg-primary text-black px-8 py-3 rounded-xl font-black uppercase italic text-sm transition-transform active:scale-95"
            >
              {t('gotoSchedule')}
            </Link>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
            <div className="absolute left-0 w-16 h-full border-r border-white/5 z-20 bg-black/60 backdrop-blur-md">
              {HOURS.map(h => (
                <div key={h.toISOString()} style={{ height: `${HOUR_HEIGHT}px` }} className="pt-4 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums">
                  {format(h, 'HH:mm')}
                </div>
              ))}
            </div>

            <div className="absolute left-16 right-0 h-full z-30">
              {!loading && lessons.map((l) => (
                <div key={l.lesson_id} style={getLessonStyles(l.session_date, l.lesson_status)}
                  className="group bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col shadow-2xl active:border-primary/40 transition-all"
                >
                  <div className="flex justify-between items-start mb-3 shrink-0">
                    <div className="flex gap-3 min-w-0">
                      <div className="min-w-0">
                        <h4 className="text-lg font-black uppercase italic tracking-tighter leading-tight truncate">
                          {l.client_name} <span className="text-primary">{l.client_last_name}</span>
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                           <span className="tabular-nums text-primary/80">{format(new Date(l.session_date), 'HH:mm')}</span>
                           <span className="opacity-30">•</span>
                           <span className="flex items-center gap-1">
                             <MapPin size={10} /> {l.location || t('baseOps')}
                           </span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[9px] font-black border flex items-center gap-1 ${
                      l.lesson_status === 'completed' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      <Clock size={10} />
                      {l.duration || '1'}H 
                    </div>
                  </div>

                  <div className="flex-1 mb-3">
                    <p className="text-[13px] text-slate-200 font-medium leading-snug italic line-clamp-3">
                      {l.summary || t('noMissionNotes')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 h-10 shrink-0 mt-auto">
                    <a href={l.client_phone ? `tel:${l.client_phone}` : '#'} 
                       className={`rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-black ${l.client_phone ? 'bg-primary' : 'bg-white/5 text-slate-700 cursor-not-allowed pointer-events-none'}`}
                    >
                      <Phone size={14} fill={l.client_phone ? "black" : "none"} />
                      <span className="text-[10px] font-black uppercase tracking-tight">{t('call')}</span>
                    </a>
                    <button 
                      onClick={() => setSelectedClient(l)}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                    >
                      <Contact2 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tight">{t('dossier')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedClient && <ClientProfileModal client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  )
}