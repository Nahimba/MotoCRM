"use client"

import { MapPin, Phone, FileText, Contact2 } from "lucide-react"

interface LessonCardProps {
  lesson: any
  onEdit: (lesson: any) => void
  onDossier: (client: any) => void
  getStyles: (start: string, duration: number) => any
  viewMode: 'day' | 'week'
  hourHeight: number
}

export function LessonCard({ lesson, onEdit, onDossier, getStyles, viewMode, hourHeight }: LessonCardProps) {
  const client = lesson.course_packages?.accounts?.clients
  const isWeek = viewMode === 'week'
  const pixelHeight = lesson.hours_spent * hourHeight
  const hasSpace = pixelHeight > 80 

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onEdit(lesson);
      }}
      style={getStyles(lesson.session_date, lesson.hours_spent)}
      className={`absolute bg-[#121212] border border-white/10 border-l-[4px] border-l-primary rounded-xl group hover:bg-[#1A1A1A] hover:border-primary/40 transition-all cursor-pointer overflow-hidden z-30 
        ${isWeek ? 'p-2' : 'p-4 md:p-5'}`}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start min-w-0">
          <div className="min-w-0 flex-1">
            <h4 className={`font-black uppercase italic text-white group-hover:text-primary transition-colors truncate 
              ${isWeek ? 'text-[11px]' : 'text-sm md:text-lg'}`}>
              {client?.name} {(!isWeek || hasSpace) && client?.last_name}
            </h4>
          </div>
          <span className="bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-black text-[8px] md:text-[9px] uppercase tabular-nums ml-2">
            {lesson.hours_spent}h
          </span>
        </div>

        {client?.phone && (hasSpace || !isWeek) && (
          <div className="flex items-center gap-1.5 text-slate-400 mt-1">
            <Phone size={isWeek ? 10 : 13} className="text-primary/70 shrink-0" />
            <span className={`font-bold tabular-nums ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
              {client.phone}
            </span>
          </div>
        )}

        {(hasSpace || !isWeek) && (
          <div className="flex-1 flex flex-col gap-1.5 min-w-0 overflow-hidden border-t border-white/5 pt-1.5 mt-1">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin size={isWeek ? 10 : 13} className="text-primary shrink-0" />
              <span className={`font-black uppercase truncate ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
                {client?.address || 'Street Hidden'}
              </span>
            </div>
            {lesson.summary && (
              <div className="flex items-start gap-1.5 text-slate-500">
                <FileText size={isWeek ? 10 : 13} className="shrink-0 mt-0.5 opacity-50" />
                <p className={`italic leading-tight line-clamp-2 ${isWeek ? 'text-[8px]' : 'text-xs md:text-sm'}`}>
                  {lesson.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* DOSSIER ACTION */}
        <div className="mt-auto flex justify-end pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDossier({ ...client, summary: lesson.summary });
            }}
            className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-primary hover:bg-primary hover:text-black transition-all"
          >
            <Contact2 size={isWeek ? 14 : 16} />
          </button>
        </div>
      </div>
    </div>
  )
}