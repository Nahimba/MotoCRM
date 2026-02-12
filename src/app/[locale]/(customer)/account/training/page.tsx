"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Bike, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  Loader2, 
  Calendar,
  History
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

export default function ClientTrainingPage() {
  const { profile } = useAuth()
  const [details, setDetails] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    const fetchTrainingData = async () => {
      setLoading(true)
      try {
        // 1. Fetch training summary from the details view
        const { data: detailsData } = await supabase
          .from('client_training_details')
          .select('*')
          .eq('profile_id', profile.id)
          .order('package_status', { ascending: true })

        if (detailsData && detailsData.length > 0) {
          // Prioritize active course or show the first one found
          setDetails(detailsData.find(p => p.package_status === 'active') || detailsData[0])
        }

        // 2. Fetch full lessons log from the updated view (now with profile_id)
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('client_lessons_log')
          .select('*')
          .eq('profile_id', profile.id) 
          .order('session_date', { ascending: false })

        if (lessonsError) throw lessonsError
        if (lessonsData) setLessons(lessonsData)

      } catch (err) {
        console.error("Dashboard Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrainingData()
  }, [profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 pb-24 text-white min-h-screen bg-black">
      
      {/* HEADER & BACK BUTTON */}
      <div className="flex items-center justify-between pt-4">
        <Link 
          href="/ru/account" 
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-all group"
        >
          <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-all">
            <ChevronLeft size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </Link>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">
          Журнал <span className="text-primary">миссий</span>
        </h1>
      </div>

      {/* 1. STATUS HUD */}
      <section className="bg-primary p-7 rounded-[2.5rem] text-black shadow-[0_20px_40px_rgba(var(--primary),0.25)] relative overflow-hidden">
        <Calendar className="absolute -right-4 -top-4 opacity-10" size={120} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Остаток обучения</p>
          <div className="flex justify-between items-end mt-2">
            <h2 className="text-5xl font-black italic uppercase leading-none">
              {details?.remaining_hours || 0} <span className="text-sm">ЧАС</span>
            </h2>
            <p className="text-[10px] font-black uppercase italic max-w-[120px] text-right leading-tight opacity-80">
              {details?.course_name || "Курс активен"}
            </p>
          </div>
        </div>
      </section>

      {/* 2. THE TRAINING FEED */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 ml-4">
          <History size={14} className="text-slate-500" />
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            История выездов
          </h3>
        </div>
        
        {lessons.length > 0 ? (
          <div className="space-y-4">
            {lessons.map((lesson) => {
              const lessonDate = new Date(lesson.session_date);
              const isUpcoming = lessonDate > new Date();
              
              return (
                <div 
                  key={lesson.lesson_id} 
                  className={`relative p-6 rounded-[2.5rem] border transition-all duration-300 ${
                    isUpcoming 
                    ? "bg-white/10 border-primary/40 shadow-[0_10px_30px_rgba(var(--primary),0.05)]" 
                    : "bg-[#0a0a0a] border-white/5 opacity-70 grayscale-[0.3]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${isUpcoming ? "bg-primary text-black" : "bg-white/5 text-slate-500"}`}>
                        <Bike size={20} />
                      </div>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1.5 ${isUpcoming ? "text-primary" : "text-slate-500"}`}>
                          {lesson.course_name || "Тренировка"}
                        </p>
                        <p className="font-black text-lg text-white leading-none italic uppercase tracking-tighter">
                          {lessonDate.toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'short',
                          })}
                          <span className="ml-2 text-slate-500 not-italic font-bold text-xs uppercase">
                            {lessonDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                    </div>
                    {isUpcoming && (
                      <span className="text-[8px] font-black bg-primary text-black px-2.5 py-1 rounded-full uppercase animate-pulse tracking-tighter">
                        Ожидается
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-5 mt-2">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Clock size={14} className={isUpcoming ? "text-primary" : "text-slate-600"} />
                      <span className="text-[11px] font-black uppercase italic tracking-wider">{lesson.hours_spent} ЧАС</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <MapPin size={14} className={isUpcoming ? "text-primary" : "text-slate-600"} />
                      <span className="text-[11px] font-black uppercase italic truncate tracking-wider">
                        {lesson.location || "Base Ops"}
                      </span>
                    </div>
                  </div>

                  {lesson.summary && (
                    <div className="mt-5 p-5 bg-black/40 border border-white/5 rounded-3xl">
                      <p className="italic text-[12px] text-slate-400 leading-relaxed font-medium">
                        "{lesson.summary}"
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                         <div className="w-4 h-[1px] bg-primary/30"></div>
                         <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                           Инструктор: {lesson.instructor_name || "Staff"}
                         </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[3rem] bg-[#050505]">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <History size={24} className="text-slate-700" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.3em]">Журнал пуст</p>
          </div>
        )}
      </div>

      <div className="text-center opacity-10 pb-4">
        <p className="text-[8px] font-black uppercase tracking-[0.5em]">System Log v3.0</p>
      </div>
    </div>
  )
}