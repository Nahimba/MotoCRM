"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { format, parseISO } from "date-fns"
import { 
  X, Check, Trash2, Calendar as CalendarIcon, User, Search,
  MapPin, FileText, Loader2, Contact2, ChevronDown, Clock
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"

interface AddLessonModalProps {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null // Current instructor ID from parent context
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
  const { profile } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState("")
  
  // Local state to track the instructor performing this specific lesson
  const [currentInstructorId, setCurrentInstructorId] = useState<string | null>(instructorId)

  const [lessonDate, setLessonDate] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState("12:00")
  const [duration, setDuration] = useState("2") 
  const [location, setLocation] = useState("")
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<'planned' | 'completed' | 'cancelled'>('planned')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedPkg = packages.find(p => p.id === selectedPackageId)
  const clientData = selectedPkg?.accounts?.clients

  // Resolve current user's Instructor ID if not provided by parent
  useEffect(() => {
    if (isOpen && !instructorId && profile) {
      const getMyInstructorId = async () => {
        const { data } = await supabase
          .from('instructors')
          .select('id')
          .eq('profile_id', profile.id)
          .single()
        if (data) setCurrentInstructorId(data.id)
      }
      getMyInstructorId()
    } else {
      setCurrentInstructorId(instructorId)
    }
  }, [isOpen, instructorId, profile])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch all active packages across the school
  useEffect(() => {
    if (isOpen) {
      const fetchPkgs = async () => {
        const { data, error } = await supabase
          .from('course_packages')
          .select(`
            id, instructor_id, total_hours,
            courses ( name ),
            accounts (
              clients ( id, name, last_name, phone, address, email, avatar_url, notes )
            ),
            lessons ( duration, status )
          `)
          .eq('status', 'active')
        
        if (!error && data) {
          const processed = data.map(pkg => {
            const used = pkg.lessons
              ?.filter((l: any) => l.status === 'completed')
              .reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0) || 0;
            return { ...pkg, remaining: pkg.total_hours - used };
          });
          setPackages(processed)
        }
      }
      fetchPkgs()

      if (editLesson) {
        const dateObj = parseISO(editLesson.session_date)
        setSelectedPackageId(editLesson.course_package_id)
        setLessonDate(format(dateObj, "yyyy-MM-dd"))
        setStartTime(format(dateObj, "HH:mm"))
        setDuration(editLesson.duration?.toString() || "2")
        setLocation(editLesson.location || "")
        setSummary(editLesson.summary || "")
        setStatus(editLesson.status || 'planned')
      } else {
        setSelectedPackageId("")
        setSearchQuery("")
        setLessonDate(format(initialDate, "yyyy-MM-dd"))
        setStartTime(format(initialDate, "HH:mm"))
        setDuration("2")
        setLocation("")
        setSummary("")
        setStatus('planned')
      }
    }
  }, [isOpen, editLesson, initialDate])

  const filteredPackages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return packages
    return packages.filter(p => {
      const fullName = `${p.accounts?.clients?.name} ${p.accounts?.clients?.last_name}`.toLowerCase()
      return fullName.includes(q) || p.courses?.name.toLowerCase().includes(q)
    })
  }, [packages, searchQuery])

  // Identify students assigned to the current user vs others
  const myStudents = filteredPackages.filter(p => p.instructor_id === currentInstructorId)
  const otherStudents = filteredPackages.filter(p => p.instructor_id !== currentInstructorId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackageId) return toast.error(t("selectStudentError"))
    if (!currentInstructorId) return toast.error("User Instructor ID not found.")

    setLoading(true)
    const [year, month, day] = lessonDate.split('-').map(Number)
    const [h, m] = startTime.split(':').map(Number)
    const finalDate = new Date(year, month - 1, day, h, m)

    const payload = {
      course_package_id: selectedPackageId,
      instructor_id: currentInstructorId, // This records WHO added it/taught it
      duration: parseFloat(duration),
      session_date: finalDate.toISOString(),
      location,
      summary,
      status,
      created_by_profile_id: profile?.id
    }

    const { error } = editLesson 
      ? await supabase.from('lessons').update(payload).eq('id', editLesson.id)
      : await supabase.from('lessons').insert([payload])

    if (!error) {
      toast.success(editLesson ? t("lessonUpdated") : t("lessonLogged"))
      onSuccess(); onClose()
    } else {
      toast.error(error.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return
    setLoading(true)
    const { error } = await supabase.from('lessons').delete().eq('id', editLesson.id)
    if (!error) { toast.success(t("deleted")); onSuccess(); onClose() }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <CalendarIcon size={20} />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">
              {editLesson ? t('editLesson') : t('scheduleLesson')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
          
          {/* SEARCH & SELECT CLIENT (COMBOBOX) */}
          <div className="space-y-3 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('selectStudent')}</label>
            
            <div className="relative group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                autoComplete="off"
                placeholder={selectedPkg ? `${selectedPkg.accounts.clients.name} ${selectedPkg.accounts.clients.last_name}` : t('searchPlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-primary transition-all"
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsDropdownOpen(true)
                }}
              />
              <ChevronDown size={16} className={`absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 w-full top-full mt-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl max-h-[280px] overflow-y-auto p-2">
                {myStudents.length > 0 && (
                  <div className="px-3 py-2 text-[9px] font-black text-primary uppercase tracking-widest">{t('myStudents')}</div>
                )}
                {myStudents.map(p => (
                  <button key={p.id} type="button" className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left"
                    onClick={() => { setSelectedPackageId(p.id); setSearchQuery(""); setIsDropdownOpen(false); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">{p.accounts?.clients?.name?.[0]}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{p.courses?.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-primary italic">{p.remaining}h</span>
                  </button>
                ))}

                {otherStudents.length > 0 && (
                  <div className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase border-t border-white/5 mt-2">{t('allOtherStudents')}</div>
                )}
                {otherStudents.map(p => (
                  <button key={p.id} type="button" className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left"
                    onClick={() => { setSelectedPackageId(p.id); setSearchQuery(""); setIsDropdownOpen(false); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-400">{p.accounts?.clients?.name?.[0]}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{p.courses?.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 italic">{p.remaining}h</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QUICK INFO PANEL */}
          {clientData && (
            <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 space-y-4">
              <div className="flex justify-between items-start border-b border-primary/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden bg-black">
                    {clientData.avatar_url ? <img src={clientData.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary font-black uppercase italic">{clientData.name?.[0]}</div>}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic">{clientData.name} {clientData.last_name}</h3>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-tighter">{selectedPkg.courses?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase">{t('remaining')}</p>
                    <div className="flex items-center gap-1 justify-end text-white font-black tabular-nums"><Clock size={10} className="text-primary"/> {selectedPkg.remaining}h</div>
                </div>
              </div>
              <button type="button" onClick={() => onOpenDossier(clientData)} className="w-full py-2 bg-primary text-black text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg shadow-primary/20">
                <Contact2 size={14} /> {t('viewDossier')}
              </button>
            </div>
          )}

          {/* STATUS SELECTOR */}
          <div className="grid grid-cols-3 gap-2">
            {(['planned', 'completed', 'cancelled'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={`py-3 rounded-xl font-black text-[9px] uppercase border transition-all ${status === s ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                {t(s)}
              </button>
            ))}
          </div>

          {/* DATE & TIME */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('date')}</label>
              <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary [color-scheme:dark]" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('time')}</label>
              <input type="time" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary [color-scheme:dark]" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
          </div>

          {/* DURATION PRESETS */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('duration')}</label>
            <div className="grid grid-cols-3 gap-2">
              {["1", "1.5", "2", "2.5", "3", "4"].map((val) => (
                <button key={val} type="button" onClick={() => setDuration(val)} className={`py-3 rounded-xl font-black text-xs border transition-all ${duration === val ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {val}h
                </button>
              ))}
            </div>
          </div>

          {/* NOTES & LOCATION */}
          <div className="space-y-4">
            <div className="relative">
              <input type="text" placeholder={t('locationPlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary" value={location} onChange={(e) => setLocation(e.target.value)} />
              <MapPin size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="relative">
              <textarea placeholder={t('notesPlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary min-h-[100px] resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} />
              <FileText size={16} className="absolute right-5 top-4 text-slate-500" />
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex gap-4 pt-4">
            {editLesson && (
              <button type="button" onClick={handleDelete} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={20} />
              </button>
            )}
            <button type="submit" disabled={loading} className="flex-1 py-5 bg-primary text-black font-black uppercase rounded-2xl hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
              {loading ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
              {editLesson ? t('update') : t('confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}