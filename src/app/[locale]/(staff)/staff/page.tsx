"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { ClipboardCheck, Users, Phone, MapPin, Contact2 } from "lucide-react"
import { format, startOfDay, endOfDay, eachHourOfInterval, setHours } from "date-fns"
import { useAuth } from "@/context/AuthContext"
import { ClientProfileModal } from "@/components/staff/ClientProfileModal"
import { useTranslations } from "next-intl" // Adjust if using different i18n lib

const HOUR_HEIGHT = 100 
const HOURS = eachHourOfInterval({
  start: setHours(startOfDay(new Date()), 7),
  end: setHours(startOfDay(new Date()), 22)
})

export default function StaffLandingPage() {
  const t = useTranslations("StaffDashboard")
  const { profile } = useAuth()
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
        .from('staff_dashboard_lessons')
        .select('*')
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

  const getLessonStyles = (startTime: string, duration: number) => {
    const date = new Date(startTime)
    const top = (date.getHours() - 7) * HOUR_HEIGHT + (date.getMinutes() / 60) * HOUR_HEIGHT
    return { 
      top: `${top}px`, 
      minHeight: '170px', // Slightly taller for Cyrillic line-heights
      left: '12px', 
      right: '12px',
      position: 'absolute' as const,
      zIndex: 40
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">{t('title')}</h1>
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">{format(new Date(), 'EEEE, dd MMMM')}</p>
        </div>
        <div className="bg-[#111] border border-white/10 px-5 py-2 rounded-xl text-center">
          <p className="text-xl font-black italic text-primary leading-none">{lessons.length}</p>
          <p className="text-[7px] font-black uppercase text-slate-500 mt-1">{t('assignments')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative overflow-y-auto bg-[#080808] rounded-[2rem] border border-white/5 h-[750px] custom-scrollbar shadow-2xl">
            <div className="relative w-full" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
              
              <div className="absolute left-0 w-16 h-full border-r border-white/5 z-20 bg-black/60 backdrop-blur-md">
                {HOURS.map(h => (
                  <div key={h.toString()} style={{ height: `${HOUR_HEIGHT}px` }} className="pt-4 text-center text-[10px] font-black text-slate-600 border-b border-white/[0.02] tabular-nums">
                    {format(h, 'HH:mm')}
                  </div>
                ))}
              </div>

              <div className="absolute left-16 right-0 h-full z-30">
                {!loading && lessons.map((l) => (
                  <div key={l.lesson_id} style={getLessonStyles(l.session_date, l.hours_spent)}
                    className="group bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col shadow-2xl active:border-primary/40 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2 shrink-0">
                      <div className="min-w-0">
                        <h4 className="text-lg font-black uppercase italic tracking-tighter leading-tight truncate">
                          {l.client_name} <span className="text-primary">{l.client_last_name}</span>
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                           <span className="tabular-nums text-primary/80">{format(new Date(l.session_date), 'HH:mm')}</span>
                           <span className="opacity-30">•</span>
                           <span className="flex items-center gap-1 uppercase tracking-tighter">
                             <MapPin size={10} /> {l.location || t('baseOps')}
                           </span>
                        </div>
                      </div>
                      <div className="bg-white/5 px-2 py-1 rounded text-[9px] font-black text-slate-400 border border-white/5">
                        {l.hours_spent}H
                      </div>
                    </div>

                    <div className="flex-1 mb-3">
                      <p className="text-[13px] text-slate-200 font-medium leading-snug italic line-clamp-4">
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
          </div>
        </div>


      </div>

      {selectedClient && <ClientProfileModal client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </div>
  )
}