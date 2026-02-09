import { MapPin, Phone, FileText } from "lucide-react"

interface LessonCardProps {
  lesson: any
  onEdit: (lesson: any) => void
  getStyles: (start: string, duration: number) => any
  viewMode: 'day' | 'week'
}

export function LessonCard({ lesson, onEdit, getStyles, viewMode }: LessonCardProps) {
  const client = lesson.course_packages?.accounts?.clients
  const isWeek = viewMode === 'week'
  
  // Logic to hide extra details if slot is too small (e.g. 1 hour at 50px height)
  const isShort = lesson.hours_spent <= 1

  return (
    <div
      onClick={() => onEdit(lesson)}
      style={getStyles(lesson.session_date, lesson.hours_spent)}
      className={`absolute bg-[#111] border border-white/10 border-l-[3px] border-l-primary rounded-lg group hover:bg-[#161616] hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-xl z-20 
        ${isWeek ? 'p-1.5' : 'p-3'}`}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-0.5 overflow-hidden">
          {/* --- NAME --- */}
          <h4 className={`font-black uppercase italic text-white group-hover:text-primary transition-colors truncate 
            ${isWeek ? 'text-[9px] leading-tight' : 'text-xs'}`}>
            {client?.name} {!isWeek && client?.last_name}
          </h4>
          
          {/* --- ADDRESS (Hidden if card is too short or in week mode to prevent clutter) --- */}
          {!isShort && (
            <div className="flex items-center gap-1 text-slate-400">
              <MapPin size={isWeek ? 8 : 10} className="text-primary shrink-0" />
              <span className={`font-bold uppercase truncate 
                ${isWeek ? 'text-[7px]' : 'text-[9px]'}`}>
                {client?.address || 'Field'}
              </span>
            </div>
          )}
        </div>

        {/* --- DURATION & NOTES ICON --- */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-1 items-center">
             {lesson.summary && <FileText size={isWeek ? 8 : 10} className="text-slate-600" />}
             {!isWeek && client?.phone && <Phone size={10} className="text-slate-600" />}
          </div>
          
          <span className="bg-primary/10 px-1 py-0.5 rounded text-primary font-black tracking-tighter text-[7px] md:text-[8px]">
            {lesson.hours_spent}H
          </span>
        </div>
      </div>
    </div>
  )
}