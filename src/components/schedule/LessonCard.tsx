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

  return (
    <div
      onClick={() => onEdit(lesson)}
      style={getStyles(lesson.session_date, lesson.hours_spent)}
      className={`absolute bg-[#111] border border-white/10 border-l-4 border-l-primary rounded-xl group hover:bg-[#161616] hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-2xl z-20 
        ${isWeek ? 'p-2' : 'p-4'}`}
    >
      <div className="flex flex-col h-full space-y-1">
        {/* --- NAME --- */}
        <h4 className={`font-black uppercase italic text-white group-hover:text-primary transition-colors truncate 
          ${isWeek ? 'text-[10px] leading-tight' : 'text-sm mb-1'}`}>
          {client?.name} {isWeek ? '' : client?.last_name}
        </h4>
        
        {/* --- ADDRESS (Always visible, but styled differently) --- */}
        <div className="flex items-start gap-1.5 text-slate-400">
          <MapPin size={isWeek ? 10 : 12} className="text-primary shrink-0 mt-0.5" />
          <span className={`font-bold uppercase truncate leading-tight
            ${isWeek ? 'text-[8px] max-w-[90%]' : 'text-[10px] max-w-[150px]'}`}>
            {client?.address || 'Field'}
          </span>
        </div>

        {/* --- PHONE (Hidden in week view to save vertical space) --- */}
        {!isWeek && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Phone size={12} className="text-primary shrink-0" />
            <span className="text-[10px] font-bold uppercase">{client?.phone}</span>
          </div>
        )}

        {/* --- SUMMARY/NOTES --- */}
        {lesson.summary && (
          <div className={`rounded-lg border border-white/5 bg-white/[0.03] 
            ${isWeek ? 'p-1 mt-1' : 'p-2 mt-2'}`}>
            <p className={`text-slate-500 italic leading-tight line-clamp-2
              ${isWeek ? 'text-[7px]' : 'text-[10px]'}`}>
              {isWeek ? "" : <FileText size={8} className="inline mr-1 text-primary/50" />}
              {lesson.summary}
            </p>
          </div>
        )}

        {/* --- DURATION TAG --- */}
        <div className={`mt-auto pt-1 flex justify-end`}>
          <span className="bg-primary/10 px-1.5 py-0.5 rounded text-primary font-black tracking-tighter text-[8px]">
            {lesson.hours_spent}H
          </span>
        </div>
      </div>
    </div>
  )
}