"use client"

import { useState, useEffect } from "react"
import { format, parseISO, addMinutes, isWithinInterval } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { X, Check, Trash2, Calendar as CalendarIcon, User, Phone, MapPin, FileText, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

interface AddLessonModalProps {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null
  initialDate: Date
  onSuccess: () => void
  editLesson: any | null
  existingLessons: any[]
}

export function AddLessonModal({ 
  isOpen, onClose, instructorId, initialDate, onSuccess, editLesson, existingLessons 
}: AddLessonModalProps) {
  const t = useTranslations("Schedule")
  const locale = useLocale()
  const dateLocale = locale === "ru" ? ru : enUS

  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [lessonDate, setLessonDate] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState("12:00")
  const [duration, setDuration] = useState("2")
  const [summary, setSummary] = useState("")

  const selectedPkg = packages.find(p => p.id === selectedPackageId)

  useEffect(() => {
    if (isOpen) {
      const fetchPkgs = async () => {
        const { data } = await supabase
          .from('course_packages')
          .select(`id, instructor_id, accounts(clients(name, last_name, phone, address))`)
          .eq('status', 'active')
        setPackages(data || [])
      }
      fetchPkgs()

      if (editLesson) {
        const dateObj = parseISO(editLesson.session_date)
        setSelectedPackageId(editLesson.course_package_id)
        setLessonDate(format(dateObj, "yyyy-MM-dd"))
        setStartTime(format(dateObj, "HH:mm"))
        setDuration(editLesson.hours_spent.toString())
        setSummary(editLesson.summary || "")
      } else {
        setSelectedPackageId("")
        setLessonDate(format(initialDate, "yyyy-MM-dd"))
        setStartTime("12:00")
        setDuration("2")
        setSummary("")
      }
    }
  }, [isOpen, editLesson, initialDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackageId) return toast.error(t("selectStudentError"))

    setLoading(true)
    const [year, month, day] = lessonDate.split('-').map(Number)
    const [h, m] = startTime.split(':').map(Number)
    const finalDate = new Date(year, month - 1, day, h, m)

    const hasConflict = existingLessons.some((l: any) => {
      if (editLesson && l.id === editLesson.id) return false
      const s = parseISO(l.session_date)
      const e = addMinutes(s, l.hours_spent * 60)
      const ns = finalDate
      const ne = addMinutes(ns, parseFloat(duration) * 60)
      
      return (
        isWithinInterval(ns, { start: s, end: addMinutes(e, -1) }) || 
        isWithinInterval(addMinutes(ne, -1), { start: s, end: e })
      )
    })

    if (hasConflict) {
      setLoading(false)
      return toast.error(t("conflict"))
    }

    const payload = {
      course_package_id: selectedPackageId,
      instructor_id: instructorId,
      hours_spent: parseFloat(duration),
      session_date: finalDate.toISOString(),
      summary
    }

    const { error } = editLesson 
      ? await supabase.from('lessons').update(payload).eq('id', editLesson.id)
      : await supabase.from('lessons').insert([payload])

    if (!error) {
      toast.success(editLesson ? t("lessonUpdated") : t("lessonLogged"))
      onSuccess()
      onClose()
    } else {
      toast.error(error.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return
    setLoading(true)
    const { error } = await supabase.from('lessons').delete().eq('id', editLesson.id)
    if (!error) { 
      toast.success(t("deleted"))
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const myStudents = packages.filter(p => p.instructor_id === instructorId)
  const unassigned = packages.filter(p => !p.instructor_id)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#141414]">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            {editLesson ? t('editLesson') : t('scheduleLesson')}
          </h2>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('lessonDate')}</label>
            <div className="relative">
              <input 
                type="date" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary transition-all" 
                value={lessonDate} 
                onChange={e => setLessonDate(e.target.value)} 
              />
              <CalendarIcon size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('selectStudent')}</label>
            <div className="relative">
              <select 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary transition-all appearance-none" 
                value={selectedPackageId} 
                onChange={(e) => setSelectedPackageId(e.target.value)}
              >
                <option value="" className="bg-black text-slate-500">{t('chooseStudent')}</option>
                {myStudents.length > 0 && (
                  <optgroup label={`⭐ ${t('myAssigned')}`} className="bg-black text-primary font-bold">
                    {myStudents.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</option>)}
                  </optgroup>
                )}
                {unassigned.length > 0 && (
                  <optgroup label={`⚪ ${t('unassigned')}`} className="bg-black text-slate-500 font-bold">
                    {unassigned.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</option>)}
                  </optgroup>
                )}
              </select>
              <User size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {selectedPkg && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[8px] font-black text-primary uppercase mb-1 flex items-center gap-1"><Phone size={8} /> {t('contact')}</p>
                <p className="text-xs font-bold">{selectedPkg.accounts?.clients?.phone || 'N/A'}</p>
              </div>
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[8px] font-black text-primary uppercase mb-1 flex items-center gap-1"><MapPin size={8} /> {t('pickup')}</p>
                <p className="text-xs font-bold truncate">{selectedPkg.accounts?.clients?.address || 'Standard'}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('startTime')}</label>
              <input 
                type="time" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)} 
              />
            </div>
            {/* --- DURATION SELECT --- */}
            <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
                {t('duration')}
            </label>
            <select 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary appearance-none" 
                value={duration} 
                onChange={e => setDuration(e.target.value)}
            >
                <option value="0.5" className="bg-black">
                {t('hours', { count: 0.5 })}
                </option>
                <option value="1" className="bg-black">
                {t('hours', { count: 1 })}
                </option>
                <option value="1.5" className="bg-black">
                {t('hours', { count: 1.5 })}
                </option>
                <option value="2" className="bg-black">
                {t('hours', { count: 2 })}
                </option>
                <option value="2.5" className="bg-black">
                {t('hours', { count: 2.5 })}
                </option>
                <option value="3" className="bg-black">
                {t('hours', { count: 3 })}
                </option>
            </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('notes')}</label>
            <div className="relative">
              <textarea 
                placeholder={t('notesPlaceholder')} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary transition-all min-h-[100px] resize-none" 
                value={summary} 
                onChange={(e) => setSummary(e.target.value)} 
              />
              <FileText size={16} className="absolute right-5 top-5 text-slate-500" />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            {editLesson && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="flex-1 py-6 bg-red-500/10 text-red-500 font-black uppercase rounded-[2rem] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-[3] py-6 bg-primary text-black font-black uppercase rounded-[2rem] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              {editLesson ? t('update') : t('confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}