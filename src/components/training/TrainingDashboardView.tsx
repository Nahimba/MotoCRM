// components/training/TrainingDashboardView.tsx
import { Bike, Clock, MapPin, ChevronLeft, Calendar, History, UserCheck } from "lucide-react"
import Link from "next/link"

interface Props {
  details: any
  lessons: any[]
  isStaff?: boolean
}

export default function TrainingDashboardView({ details, lessons, isStaff = false }: Props) {
  return (
    <div className="max-w-md mx-auto p-6 space-y-8 pb-24 text-white min-h-screen bg-black">
      
      {/* HEADER */}
      <div className="flex items-center justify-between pt-4">
        <Link 
          href={isStaff ? "/uk/staff/students" : "/uk/account"} 
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-all group"
        >
          <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-all">
            <ChevronLeft size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </Link>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">
          Журнал <span className="text-primary">навчання</span>
        </h1>
      </div>

      {/* 1. STATUS HUD */}
      <section className="bg-primary p-7 rounded-[2.5rem] text-black shadow-[0_20px_40px_rgba(var(--primary),0.25)] relative overflow-hidden">
        <Calendar className="absolute -right-4 -top-4 opacity-10" size={120} />
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Залишок навчання</p>
               <h2 className="text-5xl font-black italic uppercase leading-none mt-1">
                {details?.remaining_hours || 0} <span className="text-sm">ГОД</span>
              </h2>
            </div>
            {details?.avatar_url && (
              <img src={details.avatar_url} className="w-10 h-10 rounded-full border-2 border-black/10" alt="avatar" />
            )}
          </div>
          
          <div className="flex justify-between items-end mt-6 border-t border-black/10 pt-4">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase opacity-60">Курс</p>
              <p className="text-[11px] font-black uppercase italic leading-tight">
                {details?.course_name || "—"} ({details?.course_type || "Base"})
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[9px] font-black uppercase opacity-60">Шеф-інструктор</p>
              <p className="text-[11px] font-black uppercase italic leading-tight">
                {details?.lead_instructor_name || "Academy"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE TRAINING FEED */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 ml-4">
          <History size={14} className="text-slate-500" />
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Історія виїздів</h3>
        </div>
        
        {lessons.length > 0 ? (
          <div className="space-y-4">
            {lessons.map((lesson) => {
              const lessonDate = new Date(lesson.session_date);
              const isPlanned = lesson.status === 'planned';
              const isCancelled = ['cancelled', 'late_cancelled', 'no_show'].includes(lesson.status);
              
              return (
                <div 
                  key={lesson.lesson_id} 
                  className={`relative p-6 rounded-[2.5rem] border transition-all duration-300 ${
                    isPlanned 
                    ? "bg-white/10 border-primary/40 shadow-[0_10px_30px_rgba(var(--primary),0.05)]" 
                    : isCancelled ? "bg-red-500/5 border-red-500/10 opacity-50" : "bg-[#0a0a0a] border-white/5 opacity-70"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${isPlanned ? "bg-primary text-black" : "bg-white/5 text-slate-500"}`}>
                        <Bike size={20} />
                      </div>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isPlanned ? "text-primary" : "text-slate-500"}`}>
                          {lesson.course_name}
                        </p>
                        <p className="font-black text-lg text-white leading-none italic uppercase tracking-tighter">
                          {lessonDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                          <span className="ml-2 text-slate-500 not-italic font-bold text-xs uppercase">
                            {lessonDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                    </div>
                    {lesson.status !== 'completed' && (
                      <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${isPlanned ? "bg-primary text-black animate-pulse" : "bg-white/10 text-white"}`}>
                        {lesson.status}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-5 mt-2">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Clock size={14} className={isPlanned ? "text-primary" : "text-slate-600"} />
                      <span className="text-[11px] font-black uppercase italic tracking-wider">{lesson.duration} ГОД</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <MapPin size={14} className={isPlanned ? "text-primary" : "text-slate-600"} />
                      <span className="text-[11px] font-black uppercase italic truncate tracking-wider">
                        {lesson.location || "Локація не вказана"}
                      </span>
                    </div>
                  </div>

                  {lesson.summary && (
                    <div className="mt-5 p-5 bg-black/40 border border-white/5 rounded-3xl">
                      <p className="italic text-[12px] text-slate-400 leading-relaxed font-medium">"{lesson.summary}"</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-[1px] bg-primary/30"></div>
                           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                             Інструктор: {lesson.instructor_name}
                           </p>
                        </div>
                        {isStaff && (
                          <p className="text-[7px] font-bold text-slate-700 uppercase">Log by: {lesson.logged_by_name}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[3rem] bg-[#050505]">
            <History size={24} className="text-slate-700 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.3em]">Журнал порожній</p>
          </div>
        )}
      </div>
    </div>
  )
}