"use client"

import { MapPin, Phone, FileText, User, Bike, Car } from "lucide-react"

interface LessonCardProps {
  lesson: any
  onEdit: (lesson: any) => void
  getStyles: () => any 
  viewMode: 'day' | 'week'
  hourHeight: number
  currentInstructorId?: string | null
}

export function LessonCard({ 
  lesson, 
  onEdit, 
  getStyles, 
  viewMode, 
  hourHeight, 
  currentInstructorId
}: LessonCardProps) {
  const isWeek = viewMode === 'week'
  
  // Space calculations for responsive text and UI density
  const duration = Number(lesson.duration) || 1
  const pixelHeight = duration * hourHeight
  const hasSpace = pixelHeight > 75 
  const isVeryShort = pixelHeight < 50

  // Fallback logic for data from View
  const displayLocation = lesson.location_name || 'BASE OPS'
  const locationColor = lesson.location_color || null
  const isMoto = lesson.course_type?.toLowerCase() === 'moto'
  
  const instructorName = lesson.lesson_instructor_name || 'Unassigned';

  const getStatusStyles = () => {
    // 1. Cancelled State
    if (lesson.status === 'cancelled') {
      return 'border-l-red-500 opacity-40 bg-[#1a0a0a] grayscale-[0.5]'
    }
    // 2. Completed State
    if (lesson.status === 'completed') {
      return 'border-l-emerald-500 bg-[#0d1410]'
    }

    // 3. Planned State (Color code based on Course Type)
    if (isMoto) {
      return 'border-l-fuchsia-500 bg-[#130d14] shadow-lg shadow-fuchsia-500/5'
    }
    
    return 'border-l-primary bg-[#0d1114]'
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onEdit(lesson);
      }}
      style={getStyles()}
      className={`absolute border border-white/10 border-l-[4px] rounded-xl group 
        hover:bg-[#1a1a1a] hover:border-white/20 transition-all cursor-pointer 
        overflow-hidden flex flex-col z-30 shadow-2xl
        ${getStatusStyles()} 
        ${isWeek ? 'p-2' : 'p-4 md:p-5'}`}
    >
      {/* BACKGROUND ICON DECAL - Purely Aesthetic */}
      {/* <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
        {isMoto ? <Bike size={isWeek ? 40 : 80} /> : <Car size={isWeek ? 40 : 80} />}
      </div> */}

      {/* TOP ROW: Client Name & Type Icon */}
      <div className="flex justify-between items-start min-w-0 z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
             {isMoto ? 
               <Bike size={12} className="text-fuchsia-400 shrink-0" /> : 
               <Car size={12} className="text-primary shrink-0" />
             }
             {/* <span className={`font-black uppercase tracking-widest ${isWeek ? 'text-[7px]' : 'text-[9px]'} ${isMoto ? 'text-fuchsia-400' : 'text-primary'}`}>
               {lesson.course_type || 'Auto'}
             </span> */}
          </div>
          <h4 className={`font-black uppercase italic text-white group-hover:text-primary transition-colors truncate 
            ${isWeek ? 'text-[10px] leading-tight' : 'text-sm md:text-lg'}`}>
            {lesson.client_name} {(!isWeek || hasSpace) && lesson.client_last_name}
          </h4>
        </div>
        
        <span className={`font-black text-[9px] md:text-[10px] uppercase tabular-nums ml-2 shrink-0 px-1.5 py-0.5 rounded ${isMoto ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-primary/20 text-primary'}`}>
          {duration}h
        </span>
      </div>

      {/* SIMPLE INSTRUCTOR ROW */}
      {(hasSpace || !isWeek) && (
        <div className="flex items-center gap-1 mt-1 z-10">
          <div className="shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-white/8 border border-white/10">
            <User size={10} className="text-slate-500" />
          </div>
          <span className={`font-bold uppercase tracking-tighter truncate ${isWeek ? 'text-[8px]' : 'text-[10px]'} text-slate-500`}>
            {instructorName}
          </span>
        </div>
      )}

      {/* DETAILS ROW: Phone, Location, Summary */}
      {(hasSpace || !isWeek) && !isVeryShort && (
        <div className="flex-1 flex flex-col gap-1.5 min-w-0 overflow-hidden mt-3 z-10">
          {lesson.client_phone && (
            <div className="flex items-center gap-2 text-slate-400">
              <Phone size={isWeek ? 10 : 13} className={`${isMoto ? 'text-fuchsia-500/50' : 'text-primary/50'} shrink-0`} />
              <span className={`font-bold tabular-nums ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
                {lesson.client_phone}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* Dynamic Location Color from Database View */}
            <MapPin 
                size={isWeek ? 10 : 13} 
                style={{ color: locationColor || (isMoto ? '#e879f9' : '#3b82f6') }}
                className="shrink-0" 
            />
            <span 
                style={{ color: locationColor || '#e2e8f0' }}
                className={`font-black uppercase truncate ${isWeek ? 'text-[9px]' : 'text-xs md:text-sm'}`}
            >
              {displayLocation}
            </span>
          </div>

          {lesson.summary && (
            <div className="flex items-start gap-2 text-slate-500 border-t border-white/5 pt-2 mt-auto">
              <FileText size={isWeek ? 10 : 13} className="shrink-0 mt-0.5 opacity-50" />
              <p className={`italic leading-tight line-clamp-2 ${isWeek ? 'text-[10px]' : 'text-xs md:text-sm'}`}>
                {lesson.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}