"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Save, Calendar } from "lucide-react"

interface Props {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null
  onSuccess: () => void
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Понеділок' },
  { id: 2, label: 'Вівторок' },
  { id: 3, label: 'Середа' },
  { id: 4, label: 'Четвер' },
  { id: 5, label: "П'ятниця" },
  { id: 6, label: 'Субота' },
  { id: 0, label: 'Неділя' },
]

export function WorkHoursModal({ isOpen, onClose, instructorId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [hours, setHours] = useState<any[]>([])

  // Завантажуємо існуючий розклад при відкритті
  useEffect(() => {
    if (isOpen && instructorId) {
      fetchCurrentHours()
    }
  }, [isOpen, instructorId])

  const fetchCurrentHours = async () => {
    const { data } = await supabase
      .from('instructor_work_hours')
      .select('*')
      .eq('instructor_id', instructorId)
    
    // Створюємо масив для всіх 7 днів, заповнюючи даними з БД або дефолтними
    const fullSchedule = DAYS_OF_WEEK.map(day => {
      const existing = data?.find(d => d.day_of_week === day.id)
      return existing || {
        day_of_week: day.id,
        start_time: "09:00",
        end_time: "18:00",
        is_active: false
      }
    })
    setHours(fullSchedule)
  }

  const toggleDay = (index: number) => {
    const newHours = [...hours]
    newHours[index].is_active = !newHours[index].is_active
    setHours(newHours)
  }

  const updateTime = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const newHours = [...hours]
    newHours[index][field] = value
    setHours(newHours)
  }

  const handleSubmit = async () => {
    if (!instructorId) return
    setLoading(true)

    try {
      // Готуємо дані для збереження (додаємо instructor_id до кожного запису)
      const toSave = hours.map(h => ({
        ...h,
        instructor_id: instructorId,
        // Видаляємо id, якщо це новий запис, щоб Supabase згенерував його сам, 
        // або залишаємо для upsert
      }))

      const { error } = await supabase
        .from('instructor_work_hours')
        .upsert(toSave, { onConflict: 'instructor_id, day_of_week' })

      if (error) throw error
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Помилка при збереженні розкладу")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className=" pb-safe-bottom-mobile bg-[#0D0D0D] border-t sm:border border-white/10 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={18} />
            </div>
            <h3 className="text-sm font-black uppercase italic text-white tracking-widest">Графік роботи</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2"><X size={20}/></button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar">
          {hours.map((day, index) => (
            <div 
              key={day.day_of_week} 
              className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all ${
                day.is_active ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-50'
              }`}
            >
              {/* Day Selector Row */}
              <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[140px]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${day.is_active ? 'bg-primary' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-black rounded-full transition-all ${day.is_active ? 'left-6' : 'left-1'}`} />
                  </button>
                  <span className="text-xs font-black uppercase text-white">
                    {DAYS_OF_WEEK.find(d => d.id === day.day_of_week)?.label}
                  </span>
                </div>
              </div>

              {/* Time Inputs Row */}
              {day.is_active && (
                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end border-t border-white/5 pt-3 sm:pt-0 sm:border-t-0">
                  <div className="flex-1 sm:flex-none">
                    <input 
                      type="time"
                      step="600"
                      value={day.start_time.substring(0,5)} 
                      onChange={(e) => updateTime(index, 'start_time', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary [color-scheme:dark]"
                    />
                  </div>
                  <span className="text-slate-600">—</span>
                  <div className="flex-1 sm:flex-none">
                    <input 
                      type="time"
                      step="600"
                      value={day.end_time.substring(0,5)} 
                      onChange={(e) => updateTime(index, 'end_time', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Збереження...' : <><Save size={16} /> Зберегти розклад</>}
          </button>
        </div>
      </div>
    </div>
  )
}