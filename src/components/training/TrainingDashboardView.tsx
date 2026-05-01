// components/training/TrainingDashboardView.tsx
import { useState } from "react"
import { Clock, MapPin, Calendar, History, Box, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { toZonedTime, format } from 'date-fns-tz'
import { uk } from 'date-fns/locale'

const TZ = 'Europe/Kyiv'

interface Props {
  packages: any[] | any
  lessons: any[]
  isStaff?: boolean
}

export default function TrainingDashboardView({ packages, lessons, isStaff = false }: Props) {
  // const allPackages = Array.isArray(packages) ? packages : (packages ? [packages] : []);

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
  }, []).sort((a, b) => Number(a.isQuick) - Number(b.isQuick));

  // const activeContracts = allPackages.filter((c: any) => 
  //   c.package_status === 'active' && !c.allow_quick_creation
  // );

  return (
    // Зменшено горизонтальні padding для мобільних (px-4)
    <div className="max-w-md mx-auto px-4 py-6 space-y-8 pb-24 text-white min-h-screen bg-black font-sans overflow-x-hidden">
      
      <Header isStaff={isStaff} />

      {/* АКТИВНІ КУРСИ (HUD) */}
      {/* {activeContracts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 ml-2">
            <Box size={12} className="text-primary" />
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {isStaff ? "Курси студента" : "Ваші курси"}
            </h3>
          </div>
          
          {activeContracts.map((contract: any) => (
            <ActiveCourseHUD key={contract.package_id || contract.id} contract={contract} />
          ))}
        </div>
      )} */}

      {/* ІСТОРІЯ СЕСІЙ */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-2 ml-2">
          <History size={12} className="text-slate-500" />
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Історія сесій</h3>
        </div>
        
        {groupedLessons.length > 0 ? (
          groupedLessons.map((group) => (
            <LessonGroup key={group.id} group={group} isStaff={isStaff} />
          ))
        ) : (
          <p className="text-center text-slate-600 italic text-xs py-10">Занять ще не зафіксовано</p>
        )}
      </div>
    </div>
  )
}

function Header({ isStaff }: { isStaff: boolean }) {
  return (
    <div className="flex items-center justify-between pt-2 px-2">
      <h1 className="text-lg font-black italic uppercase tracking-tighter">
        Журнал <span className="text-primary">навчання</span>
      </h1>
    </div>
  )
}

// function ActiveCourseHUD({ contract }: { contract: any }) {
//   const total = contract.total_hours || 0;
//   const remaining = contract.remaining_hours || 0;
//   const spent = Math.max(0, total - remaining);
//   const progressPercent = total > 0 ? (spent / total) * 100 : 0;

//   return (
//     // Адаптивні відступи p-5 та закруглення для кращого вигляду на вузьких екранах
//     <section className="bg-primary p-5 sm:p-7 rounded-[2rem] text-black shadow-lg relative overflow-hidden">
//       <Calendar className="absolute -right-4 -top-4 opacity-10 rotate-12" size={100} />
      
//       <div className="relative z-10">
//         <div className="flex justify-between items-start">
//           <div>
//             <p className="text-[8px] font-black uppercase tracking-wider opacity-60">Залишок</p>
//             <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter mt-1">
//               {remaining} <span className="text-xs tracking-normal">ГОД</span>
//             </h2>
//           </div>
//           <div className="bg-black text-primary px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md shrink-0">
//             <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
//             <span className="text-[7px] font-black uppercase tracking-wider">Active</span>
//           </div>
//         </div>

//         <div className="mt-6 space-y-1.5">
//           <div className="flex justify-between items-end px-0.5">
//             <p className="text-[7px] font-black uppercase opacity-60">Прогрес {spent}/{total} год</p>
//             <p className="text-[9px] font-black italic">{Math.round(progressPercent)}%</p>
//           </div>
//           <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden border border-black/5">
//             <div 
//               className="h-full bg-black rounded-full transition-all duration-1000 ease-out" 
//               style={{ width: `${progressPercent}%` }}
//             />
//           </div>
//         </div>
        
//         <div className="mt-5 border-t border-black/10 pt-4">
//           <p className="text-[7px] font-black uppercase opacity-50">Програма</p>
//           <p className="text-[11px] font-black uppercase italic truncate leading-tight mt-0.5">
//             {contract.course_name}
//           </p>
//         </div>
//       </div>
//     </section>
//   )
// }

function LessonGroup({ group, isStaff }: { group: any, isStaff: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="space-y-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
          group.isQuick ? 'bg-amber-400/5 border-amber-400/20' : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {group.isQuick ? <Zap size={12} className="text-amber-400 shrink-0" /> : <Box size={12} className="text-primary shrink-0" />}
          <div className="text-left truncate">
            <h3 className="text-[9px] font-black text-white uppercase tracking-wider leading-none truncate">
              {group.name}
            </h3>
            <p className="text-[7px] text-slate-500 uppercase font-bold mt-1">
              {group.lessons.length} СЕСІЇ • {group.isQuick ? 'РАЗОВИЙ' : 'КУРС'}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={14} className="text-slate-600 shrink-0" /> : <ChevronDown size={14} className="text-slate-600 shrink-0" />}
      </button>

      {isOpen && (
        // Корекція Timeline для вузьких екранів (ml-4 та pl-5)
        <div className="relative ml-4 pl-5 space-y-4 border-l border-dashed border-white/10">
          {group.lessons.map((lesson: any) => (
            <div key={lesson.lesson_id} className="relative">
              <div className={`absolute -left-[24.5px] top-5 w-2 h-2 rounded-full border-2 border-black z-10 ${
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
    <div className={`relative p-4 rounded-2xl border transition-all duration-300 ${
      isPlanned 
        ? "bg-white/10 border-primary/30 shadow-sm" 
        : isCancelled 
          ? "bg-red-500/5 border-red-500/10 opacity-60" 
          : "bg-white/[0.03] border-white/5"
    }`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
            isPlanned ? "bg-primary text-black" : "bg-white/5 text-slate-400"
          }`}>
            <span className="text-xs font-black italic leading-none">{format(zonedDate, 'dd')}</span>
            <span className="text-[10px] font-black uppercase leading-none mt-0.5">{format(zonedDate, 'MM', { locale: uk })}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[12px] font-black text-white italic uppercase tracking-tighter block leading-none">
              {format(zonedDate, 'HH:mm')}
            </span>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider truncate leading-none mt-1">
              {lesson.instructor_name}
            </p>
          </div>
        </div>
        {isPlanned && (
           <span className="text-[6px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase shrink-0">
             Заплановано
           </span>
        )}
      </div>

      {/* Гнучка сітка параметрів (flex-wrap) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 font-black uppercase italic text-[9px] text-slate-400 tracking-wider">
        <div className="flex items-center gap-1.5">
          <Clock size={10} className={isPlanned ? "text-primary" : "text-slate-600"} />
          <span>{lesson.duration} Г</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <MapPin size={10} className={isPlanned ? "text-primary" : "text-slate-600"} />
          <span className="truncate max-w-[80px]">{lesson.location || "Base"}</span>
        </div>
      </div>

      {lesson.summary && (
        <div className="p-3 bg-black/40 border border-white/5 rounded-xl relative">
          <p className="italic text-[10px] text-slate-400 leading-snug pl-1">
            "{lesson.summary}"
          </p>
        </div>
      )}
    </div>
  )
}