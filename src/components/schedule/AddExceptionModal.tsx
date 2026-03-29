"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Coffee, Palmtree, ShieldAlert, Clock, Calendar, Trash2, ArrowRight } from "lucide-react"
import { format, isBefore, parseISO } from "date-fns"

interface Props {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null
  onSuccess: () => void
  initialDate: Date
  editException?: any
}

const TYPES = [
  { id: 'busy', label: 'Зайнятий', icon: Coffee },
  { id: 'vacation', label: 'Відпустка', icon: Palmtree },
  { id: 'sick', label: 'Лікарняний', icon: ShieldAlert },
]

export function AddExceptionModal({ isOpen, onClose, instructorId, onSuccess, initialDate, editException }: Props) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("busy")
  const [isAllDay, setIsAllDay] = useState(false)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  
  // Поля для діапазону дат
  const [startDate, setStartDate] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(initialDate, 'yyyy-MM-dd'))

  useEffect(() => {
    if (editException) {
      setTitle(editException.title || "")
      setType(editException.type || "busy")
      setIsAllDay(editException.is_all_day || false)
      setStartDate(format(new Date(editException.start_at), 'yyyy-MM-dd'))
      setEndDate(format(new Date(editException.end_at), 'yyyy-MM-dd'))
      
      if (!editException.is_all_day) {
        setStartTime(format(new Date(editException.start_at), 'HH:mm'))
        setEndTime(format(new Date(editException.end_at), 'HH:mm'))
      }
    } else {
      setTitle("")
      setType("busy")
      setIsAllDay(false)
      const formattedInitial = format(initialDate, 'yyyy-MM-dd')
      setStartDate(formattedInitial)
      setEndDate(formattedInitial)
      setStartTime("09:00")
      setEndTime("10:00")
    }
  }, [editException, isOpen, initialDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructorId) return
    setLoading(true)

    // Формуємо ISO рядки. Для All Day беремо повну добу від стартової до кінцевої дати
    const start_at = isAllDay ? `${startDate}T00:00:00Z` : `${startDate}T${startTime}:00Z`
    const end_at = isAllDay ? `${endDate}T23:59:59Z` : `${endDate}T${endTime}:00Z`

    const payload = {
      instructor_id: instructorId,
      title: title || TYPES.find(t => t.id === type)?.label,
      type,
      is_all_day: isAllDay,
      start_at,
      end_at
    }

    try {
      let error
      if (editException?.id) {
        const res = await supabase.from('instructor_exceptions').update(payload).eq('id', editException.id)
        error = res.error
      } else {
        const res = await supabase.from('instructor_exceptions').insert([payload])
        error = res.error
      }

      if (error) throw error
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Save Exception Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editException?.id || !confirm("Видалити це блокування?")) return
    setLoading(true)
    try {
      const { error } = await supabase.from('instructor_exceptions').delete().eq('id', editException.id)
      if (error) throw error
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Delete Exception Error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0D0D0D] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-sm font-black uppercase italic text-primary">
            {editException ? 'Редагувати блокування' : 'Блокування часу'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">


          {/* Тип блокування */}
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  type === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-slate-500'
                }`}
              >
                <t.icon size={20} />
                <span className="text-[10px] font-black uppercase">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Опис */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Опис</label>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Подробиці, якщо потрібно"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary text-white transition-colors"
            />
          </div>

          {/* Діапазон дат */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
                <Calendar size={12} /> Початок
              </label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  // Якщо дата кінця стає раніше дати початку — підтягуємо її
                  if (isBefore(parseISO(endDate), parseISO(e.target.value))) {
                    setEndDate(e.target.value)
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-primary transition-colors color-scheme-dark"
              />
            </div>
            
            <div className="pb-3 text-slate-600">
              <ArrowRight size={16} />
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
                Кінець
              </label>
              <input 
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-primary transition-colors color-scheme-dark"
              />
            </div>
          </div>

          {/* Весь день */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock size={16} />
              <span className="text-xs font-bold uppercase">Весь період</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isAllDay ? 'bg-primary' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-black rounded-full transition-all ${isAllDay ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Час (якщо не весь день) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Час початку</label>
                <input type="time" step="600" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Час кінця</label>
                <input type="time" step="600" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors [color-scheme:dark]" />
              </div>
            </div>
          )}

          {/* Кнопки дій */}
          <div className="flex gap-3 pt-2">
            {editException && (
              <button 
                type="button"
                onClick={handleDelete}
                className="bg-red-500/10 text-red-500 p-4 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                title="Видалити"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              disabled={loading}
              className="flex-1 bg-primary text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all disabled:opacity-50"
            >
              {loading ? 'Збереження...' : editException ? 'Оновити' : 'Заблокувати період'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}