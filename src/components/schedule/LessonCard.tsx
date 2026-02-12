"use client"

import { MapPin, Phone, FileText } from "lucide-react"

interface LessonCardProps {
  lesson: any
  onEdit: (lesson: any) => void
  getStyles: (start: string, duration: number, status: string) => any 
  viewMode: 'day' | 'week'
  hourHeight: number
}

export function LessonCard({ lesson, onEdit, getStyles, viewMode, hourHeight }: LessonCardProps) {
  const isWeek = viewMode === 'week'
  
  // Strictly using duration
  const duration = lesson.duration || 1
  const pixelHeight = duration * hourHeight
  const hasSpace = pixelHeight > 75 

  const displayLocation = lesson.location || 'BASE OPS'

  const getStatusColor = () => {
    switch (lesson.status) {
      case 'cancelled': 
        return 'border-l-red-500 opacity-40 bg-[#1a0a0a] grayscale-[0.5]';
      case 'completed': 
        return 'border-l-emerald-500 bg-[#0d1410]';
      default: 
        return 'border-l-primary bg-[#111]';
    }
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onEdit(lesson);
      }}
      style={getStyles(lesson.session_date, duration, lesson.status)}
      className={`absolute border border-white/10 border-l-[4px] rounded-xl group 
        hover:bg-[#161616] hover:border-primary/40 transition-all cursor-pointer 
        overflow-hidden flex flex-col z-30 shadow-lg
        ${getStatusColor()} 
        ${isWeek ? 'p-2' : 'p-4 md:p-5'}`}
    >
      <div className="flex justify-between items-start min-w-0">
        <div className="min-w-0 flex-1">
          <h4 className={`font-black uppercase italic text-white group-hover:text-primary transition-colors truncate 
            ${isWeek ? 'text-[10px] leading-tight' : 'text-sm md:text-lg'}`}>
            {lesson.client_name} {(!isWeek || hasSpace) && lesson.client_last_name}
          </h4>
        </div>
        <span className="text-primary font-black text-[9px] md:text-[10px] uppercase tabular-nums ml-2 shrink-0">
          {duration}h
        </span>
      </div>

      {(hasSpace || !isWeek) && (
        <div className="flex-1 flex flex-col gap-1.5 min-w-0 overflow-hidden mt-2">
          {lesson.client_phone && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone size={isWeek ? 10 : 13} className="text-primary/70 shrink-0" />
              <span className={`font-bold tabular-nums ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
                {lesson.client_phone}
              </span>
            </div>
          )}
          
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