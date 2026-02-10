"use client"

import { MapPin, Phone, FileText } from "lucide-react"

interface LessonCardProps {
  lesson: any
  onEdit: (lesson: any) => void
  getStyles: (start: string, duration: number) => any
  viewMode: 'day' | 'week'
  hourHeight: number
}

export function LessonCard({ lesson, onEdit, getStyles, viewMode, hourHeight }: LessonCardProps) {
  const client = lesson.course_packages?.accounts?.clients
  const isWeek = viewMode === 'week'
  const pixelHeight = lesson.hours_spent * hourHeight
  const hasSpace = pixelHeight > 75 

  // STRICT LOGIC: Use lesson location ONLY, then neutral default
  const displayLocation = lesson.location || 'BASE OPS'

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onEdit(lesson);
      }}
      style={getStyles(lesson.session_date, lesson.hours_spent)}
      className={`absolute bg-[#111] border border-white/10 border-l-[4px] border-l-primary rounded-xl group hover:bg-[#161616] hover:border-primary/40 transition-all cursor-pointer overflow-hidden z-30 flex flex-col
        ${isWeek ? 'p-2' : 'p-4 md:p-5'}`}
    >
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start min-w-0">
        <div className="min-w-0 flex-1">
          <h4 className={`font-black uppercase italic text-white group-hover:text-primary transition-colors truncate 
            ${isWeek ? 'text-[11px]' : 'text-sm md:text-lg'}`}>
            {client?.name} {(!isWeek || hasSpace) && client?.last_name}
          </h4>
        </div>
        <span className="text-primary font-black text-[9px] md:text-[10px] uppercase tabular-nums ml-2 shrink-0">
          {lesson.hours_spent}h
        </span>
      </div>

      {/* BODY SECTION */}
      {(hasSpace || !isWeek) && (
        <div className="flex-1 flex flex-col gap-1.5 min-w-0 overflow-hidden mt-2">
          {client?.phone && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone size={isWeek ? 10 : 13} className="text-primary/70 shrink-0" />
              <span className={`font-bold tabular-nums ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
                {client.phone}
              </span>
            </div>
          )}
          
          {/* LOCATION: Explicitly from Lesson Row */}
          <div className="flex items-center gap-1.5 text-slate-200">
            <MapPin size={isWeek ? 10 : 13} className="text-primary shrink-0" />
            <span className={`font-black uppercase truncate ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
              {displayLocation}
            </span>
          </div>

          {lesson.summary && (
            <div className="flex items-start gap-1.5 text-slate-500 border-t border-white/5 pt-1.5 mt-auto">
              <FileText size={isWeek ? 10 : 13} className="shrink-0 mt-0.5 opacity-50" />
              <p className={`italic leading-tight line-clamp-2 ${isWeek ? 'text-[8px]' : 'text-xs md:text-sm'}`}>
                {lesson.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}