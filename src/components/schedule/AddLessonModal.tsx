"use client"

import { useState, useEffect, useRef } from "react"
import { format, parseISO, addMinutes, isWithinInterval } from "date-fns"
import { ru, enUS } from "date-fns/locale"
import { X, Check, Trash2, Calendar as CalendarIcon, User, Phone, MapPin, FileText, Loader2, Contact2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

interface AddLessonModalProps {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null
  initialDate: Date
  onSuccess: () => void
  onOpenDossier: (client: any) => void
  editLesson: any | null
  existingLessons: any[]
}

export function AddLessonModal({ 
  isOpen, onClose, instructorId, initialDate, onSuccess, onOpenDossier, editLesson, existingLessons 
}: AddLessonModalProps) {
  const t = useTranslations("Schedule")
  const locale = useLocale()
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [lessonDate, setLessonDate] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState("12:00")
  const [duration, setDuration] = useState("2")
  const [location, setLocation] = useState("")
  const [summary, setSummary] = useState("")

  const abortRef = useRef<AbortController | null>(null)
  const selectedPkg = packages.find(p => p.id === selectedPackageId)

  useEffect(() => {
    if (isOpen) {
      const fetchPkgs = async () => {
        const { data } = await supabase
          .from('course_packages')
          .select(`id, instructor_id, accounts(clients(*))`)
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
        setLocation(editLesson.location || "")
        setSummary(editLesson.summary || "")
      } else {
        setSelectedPackageId("")
        setLessonDate(format(initialDate, "yyyy-MM-dd"))
        setStartTime("12:00")
        setDuration("2")
        setLocation("")
        setSummary("")
      }
    }
    return () => abortRef.current?.abort()
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
      location: location,
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
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <CalendarIcon size={20} />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">
              {editLesson ? t('editLesson') : t('scheduleLesson')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
          
          {/* STUDENT SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('selectStudent')}</label>
            <div className="relative">
              <select 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer" 
                value={selectedPackageId} 
                onChange={(e) => setSelectedPackageId(e.target.value)}
              >
                <option value="" className="bg-black text-slate-500">{t('chooseStudent')}</option>
                {myStudents.length > 0 && (
                  <optgroup label={t('myAssigned')} className="bg-black text-primary">
                    {myStudents.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</option>)}
                  </optgroup>
                )}
                {unassigned.length > 0 && (
                  <optgroup label={t('unassigned')} className="bg-black text-slate-500">
                    {unassigned.map(p => <option key={p.id} value={p.id} className="bg-black text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</option>)}
                  </optgroup>
                )}
              </select>
              <User size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* STUDENT DOSSIER QUICK-VIEW */}
          {selectedPkg && (
            <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-primary/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary text-black flex items-center justify-center">
                    <User size={14} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-black uppercase italic text-white tracking-tight">Student File</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDossier(selectedPkg.accounts.clients)}
                  className="px-4 py-2 bg-primary text-black text-[10px] font-black uppercase rounded-xl flex items-center gap-2 hover:bg-white transition-all active:scale-95"
                >
                  <Contact2 size={14} /> {t('viewDossier') || 'Dossier'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <p className="text-[8px] font-black text-primary uppercase flex items-center gap-1 opacity-70"><Phone size={8}/> {t('contact')}</p>
                   <p className="text-xs font-bold tabular-nums">{selectedPkg.accounts?.clients?.phone || '—'}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[8px] font-black text-primary uppercase flex items-center gap-1 opacity-70"><MapPin size={8}/> {t('homeAddress') || 'Home'}</p>
                   <p className="text-xs font-bold truncate opacity-60 italic">{selectedPkg.accounts?.clients?.address || 'Standard'}</p>
                 </div>
              </div>
            </div>
          )}

          {/* DATE & TIME ROW */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('lessonDate')}</label>
              <input 
                type="date" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary" 
                value={lessonDate} 
                onChange={e => setLessonDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('startTime')}</label>
              <input 
                type="time" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)} 
              />
            </div>
          </div>

          {/* DURATION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('duration')}</label>
            <div className="grid grid-cols-3 gap-2">
              {["1", "1.5", "2", "2.5", "3", "4"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDuration(val)}
                  className={`py-3 rounded-xl font-black text-xs transition-all border ${
                    duration === val 
                    ? 'bg-primary text-black border-primary' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {val}h
                </button>
              ))}
            </div>
          </div>

          {/* LESSON SPECIFIC LOCATION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('lessonLocation') || 'LESSON LOCATION'}</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder={t('locationPlaceholder') || "Where is the meeting point?"}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary transition-all" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
              />
              <MapPin size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* NOTES */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('notes')}</label>
            <div className="relative">
              <textarea 
                placeholder={t('notesPlaceholder')} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary min-h-[80px] resize-none" 
                value={summary} 
                onChange={(e) => setSummary(e.target.value)} 
              />
              <FileText size={16} className="absolute right-5 top-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-4 pt-4">
            {editLesson && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 py-5 bg-primary text-black font-black uppercase rounded-2xl hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/10"
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