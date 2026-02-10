import { supabase } from "@/lib/supabase"
import { Bike, Clock, MapPin, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function ClientTrainingPage() {
  // 1. Get current client ID (This should eventually come from your Auth session)
  const clientId = "dee3e0c3-b8d9-48b2-bd9c-0ba63624b2b0"; 

  // 2. Fetch data from our specialized Views
  // We fetch the status from details and the list from the log
  const [detailsRes, lessonsRes] = await Promise.all([
    supabase.from('client_training_details').select('*').eq('client_id', clientId).single(),
    supabase.from('client_lessons_log').select('*').eq('client_id', clientId)
  ]);

  const info = detailsRes.data;
  const allLessons = lessonsRes.data || [];

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 pb-24">
      {/* HEADER & BACK BUTTON */}
      <div className="flex items-center justify-between">
        <Link 
          href="/ru/account" 
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </Link>
        <h1 className="text-xl font-black italic uppercase text-white tracking-tighter">
          Журнал миссий
        </h1>
      </div>

      {/* 1. STATUS HUD - Using client_training_details */}
      <section className="bg-primary p-6 rounded-[2.5rem] text-black shadow-[0_20px_40px_rgba(var(--primary),0.2)]">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Остаток обучения</p>
        <div className="flex justify-between items-end mt-2">
          <h2 className="text-4xl font-black italic uppercase leading-none">
            {info?.remaining_hours || 0} <span className="text-sm">ЧАС</span>
          </h2>
          <p className="text-[10px] font-bold uppercase italic max-w-[120px] text-right leading-tight">
            Курс: {info?.course_name || "Не назначен"}
          </p>
        </div>
      </section>

      {/* 2. THE TRAINING FEED - Using client_lessons_log */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">
          История выездов
        </h3>
        
        {allLessons.length > 0 ? (
          allLessons.map((lesson) => {
            const isUpcoming = new Date(lesson.session_date) > new Date();
            
            return (
              <div 
                key={lesson.lesson_id} 
                className={`relative p-5 rounded-[2.5rem] border transition-all ${
                  isUpcoming 
                  ? "bg-white/10 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                  : "bg-[#0a0a0a] border-white/5 opacity-80"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-2xl ${isUpcoming ? "bg-primary text-black" : "bg-white/5 text-slate-400"}`}>
                      <Bike size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-primary tracking-tighter leading-none mb-1">
                        {lesson.course_name || "Общая тренировка"}
                      </p>
                      <p className="font-bold text-sm text-white">
                        {new Date(lesson.session_date).toLocaleDateString('ru-RU', { 
                          day: 'numeric', 
                          month: 'long',
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  {isUpcoming && (
                    <span className="text-[8px] font-black bg-primary text-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                      Ожидается
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock size={12} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase">{lesson.hours_spent} ЧАС</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin size={12} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase truncate">
                      {lesson.location || "Трек"}
                    </span>
                  </div>
                </div>

                {lesson.summary && (
                  <div className="mt-4 p-4 bg-black/50 border border-white/5 rounded-2xl italic text-[11px] text-slate-400 leading-relaxed">
                    "{lesson.summary}"
                    <div className="mt-2 not-italic text-[8px] font-black text-slate-600 uppercase tracking-widest">
                      Инструктор: {lesson.instructor_name}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">История пуста</p>
          </div>
        )}
      </div>
    </div>
  )
}