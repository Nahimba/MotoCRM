// components/training/TrainingDashboardView.tsx
import { useState } from "react"
import { Clock, MapPin, ChevronLeft, Calendar, History, Box, Zap, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { toZonedTime, format } from 'date-fns-tz'

const TZ = 'Europe/Kyiv'

interface Props {
  details: any 
  lessons: any[]
  isStaff?: boolean
}

export default function TrainingDashboardView({ details, lessons, isStaff = false }: Props) {
  
  // 1. Grouping History Logic - SORTED: Regular Courses Top, Quick Bottom
  const groupedLessons = lessons.reduce((acc: any[], lesson) => {
    const existingGroup = acc.find(g => g.id === lesson.course_package_id);
    if (existingGroup) {
      existingGroup.lessons.push(lesson);
    } else {
      acc.push({
        id: lesson.course_package_id,
        name: lesson.course_name,
        isQuick: lesson.allow_quick_creation || false,
        lessons: [lesson]
      });
    }
    return acc;
  }, []).sort((a, b) => {
    // If a is Quick and b is Regular, push a down (return 1)
    if (a.isQuick && !b.isQuick) return 1;
    // If a is Regular and b is Quick, pull a up (return -1)
    if (!a.isQuick && b.isQuick) return -1;
    return 0;
  });

  // 2. Filter logic: Show all active contracts but NOT allow_quick_creation in the HUD
  const activeContracts = (details?.active_contracts || (details ? [details] : []))
    .filter((c: any) => !c.allow_quick_creation);

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 pb-24 text-white min-h-screen bg-black font-sans">
      
      {/* HEADER */}
      <Header isStaff={isStaff} />

      {/* ACTIVE COURSES (HUD STACK) */}
      {activeContracts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-4">
            <Box size={14} className="text-primary" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ваші курси</h3>
          </div>
          
          {activeContracts.map((contract: any, idx: number) => (
            <ActiveCourseHUD key={contract.id || idx} contract={contract} />
          ))}
        </div>
      )}

      {/* HISTORY FEED */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3 ml-4">
          <History size={14} className="text-slate-500" />
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Історія сесій</h3>
        </div>
        
        {groupedLessons.map((group) => (
          <LessonGroup key={group.id} group={group} isStaff={isStaff} />
        ))}
      </div>
    </div>
  )
}

/* --- REUSABLE COMPONENTS --- */

function Header({ isStaff }: { isStaff: boolean }) {
  return (
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
  )
}

function ActiveCourseHUD({ contract }: { contract: any }) {
  const total = contract.total_hours || 0;
  const remaining = contract.remaining_hours || 0;
  const spent = Math.max(0, total - remaining);
  const progressPercent = total > 0 ? (spent / total) * 100 : 0;

  return (
    <section className="bg-primary p-7 rounded-[2.5rem] text-black shadow-[0_20px_40px_rgba(var(--primary),0.2)] relative overflow-hidden">
      <Calendar className="absolute -right-6 -top-6 opacity-10 rotate-12" size={140} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Залишок навчання</p>
            <h2 className="text-5xl font-black italic uppercase leading-none tracking-tighter mt-1">
              {remaining} <span className="text-sm tracking-normal">ГОД</span>
            </h2>
          </div>
          <div className="bg-black text-primary px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-wider">Курс</span>
          </div>
        </div>

        <div className="mt-7 space-y-2">
          <div className="flex justify-between items-end px-1">
            <p className="text-[8px] font-black uppercase opacity-60">Прогрес {spent}/{total} год</p>
            <p className="text-[10px] font-black italic">{Math.round(progressPercent)}%</p>
          </div>
          <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden border border-black/5">
            <div 
              className="h-full bg-black rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6 border-t border-black/10 pt-5">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black uppercase opacity-50">Назва програми</p>
            <p className="text-[12px] font-black uppercase italic leading-none truncate max-w-[180px]">
              {contract.course_name}
            </p>
          </div>
          
          <Link href="/uk/booking" className="bg-black text-primary p-3 rounded-2xl shadow-xl">
            <Zap size={16} className="fill-primary" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function LessonGroup({ group, isStaff }: { group: any, isStaff: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
          group.isQuick ? 'bg-amber-400/5 border-amber-400/20' : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          {group.isQuick ? <Zap size={14} className="text-amber-400" /> : <Box size={14} className="text-primary" />}
          <div className="text-left">
            <h3 className="text-[10px] font-black text-white uppercase tracking-wider leading-none">
              {group.name}
            </h3>
            <p className="text-[8px] text-slate-500 uppercase font-bold mt-1">
              {group.lessons.length} СЕСІЇ • {group.isQuick ? 'РАЗОВИЙ' : 'КУРС'}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
      </button>

      {isOpen && (
        <div className="relative ml-6 pl-8 space-y-6 border-l border-dashed border-white/10">
          {group.lessons.map((lesson: any) => (
            <div key={lesson.lesson_id} className="relative">
              <div className={`absolute -left-[37px] top-6 w-4 h-4 rounded-full border-4 border-black z-10 ${
                lesson.status === 'planned' ? 'bg-primary' : 'bg-white/20'
              }`} />
              <LessonCard lesson={lesson} isStaff={isStaff} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LessonCard({ lesson, isStaff }: { lesson: any, isStaff: boolean }) {
  const zonedDate = toZonedTime(new Date(lesson.session_date), TZ)
  const isPlanned = lesson.status === 'planned';
  const isCancelled = ['cancelled', 'late_cancelled', 'no_show'].includes(lesson.status);

  return (
    <div className={`relative p-5 rounded-[2rem] border transition-all duration-300 ${
      isPlanned 
        ? "bg-white/10 border-primary/30 shadow-[0_10px_20px_rgba(var(--primary),0.02)]" 
        : isCancelled 
          ? "bg-red-500/5 border-red-500/10 opacity-50" 
          : "bg-white/[0.03] border-white/5"
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl ${
            isPlanned ? "bg-primary text-black" : "bg-white/5 text-slate-400"
          }`}>
            <span className="text-sm font-black italic leading-none">{format(zonedDate, 'dd')}</span>
            <span className="text-[6px] font-black uppercase">{format(zonedDate, 'MMM')}</span>
          </div>
          <div>
            <span className="text-xs font-black text-white italic uppercase tracking-tighter">
              {format(zonedDate, 'HH:mm')}
            </span>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider leading-none mt-1">
              {lesson.instructor_name}
            </p>
          </div>
        </div>
        {isPlanned && (
           <span className="text-[7px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">
             Заплановано
           </span>
        )}
      </div>

      <div className="flex gap-6 mb-4 font-black uppercase italic text-[10px] text-slate-400 tracking-wider">
        <div className="flex items-center gap-2">
          <Clock size={12} className={isPlanned ? "text-primary" : "text-slate-600"} />
          <span>{lesson.duration} ГОД</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={12} className={isPlanned ? "text-primary" : "text-slate-600"} />
          <span className="truncate max-w-[100px]">{lesson.location || "Base"}</span>
        </div>
      </div>

      {lesson.summary && (
        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl relative">
          <div className="absolute left-3 top-3 w-1 h-1 rounded-full bg-primary/30" />
          <p className="italic text-[11px] text-slate-400 leading-relaxed pl-2">"{lesson.summary}"</p>
        </div>
      )}
    </div>
  )
}