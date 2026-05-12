"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Save, Calendar } from "lucide-react"
import { BaseModal } from "@/components/crm_ui/BaseModal"

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

  const fetchCurrentHours = useCallback(async () => {
    if (!instructorId) return
    const { data } = await supabase
      .from('instructor_work_hours')
      .select('*')
      .eq('instructor_id', instructorId)
    
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
  }, [instructorId])

  useEffect(() => {
    if (isOpen && instructorId) fetchCurrentHours()
  }, [isOpen, instructorId, fetchCurrentHours])

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
      const toSave = hours.map(({ id, created_at, ...rest }) => ({
        ...rest,
        instructor_id: instructorId,
      }))
      const { error } = await supabase
        .from('instructor_work_hours')
        .upsert(toSave, { onConflict: 'instructor_id, day_of_week' })

      if (error) throw error
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Помилка збереження")
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Графік роботи"
      icon={<Calendar size={18} />}
      footer={
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'Збереження...' : <><Save size={16} /> Зберегти розклад</>}
        </button>
      }
    >
      <div className="space-y-3">
        {hours.map((day, index) => (
          <div 
            key={day.day_of_week} 
            className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all ${
              day.is_active ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-50'
            }`}
          >
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

            {day.is_active && (
              <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end border-t border-white/5 pt-3 sm:pt-0 sm:border-t-0">
                <input 
                  type="time"
                  value={day.start_time.substring(0,5)} 
                  onChange={(e) => updateTime(index, 'start_time', e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary [color-scheme:dark]"
                />
                <span className="text-slate-600">—</span>
                <input 
                  type="time"
                  value={day.end_time.substring(0,5)} 
                  onChange={(e) => updateTime(index, 'end_time', e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary [color-scheme:dark]"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </BaseModal>
  )
}