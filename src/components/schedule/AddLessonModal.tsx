"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { format, parseISO } from "date-fns"
import { 
  X, Check, Trash2, Calendar as CalendarIcon, Search,
  MapPin, FileText, Loader2, Contact2, ChevronDown, Clock, User
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"

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
  isOpen, onClose, instructorId, initialDate, onSuccess, onOpenDossier, editLesson 
}: AddLessonModalProps) {
  const t = useTranslations("Schedule")
  const { profile: authProfile } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState("")
  
  const [lessonDate, setLessonDate] = useState(format(initialDate, 'yyyy-MM-dd'))
  const [selectedHour, setSelectedHour] = useState("12")
  const [selectedMinute, setSelectedMinute] = useState("00")
  
  const [duration, setDuration] = useState("2") 
  const [locationId, setLocationId] = useState<string>("")
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<'planned' | 'completed' | 'cancelled'>('planned')

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Resolve selected package and client data
  const selectedPkg = useMemo(() => 
    packages.find(p => p.id === selectedPackageId), 
    [packages, selectedPackageId]
  )
  
  const clientData = selectedPkg?.accounts?.clients

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const { data: locData } = await supabase.from('locations').select('*').eq('is_active', true)
          if (locData) setLocations(locData)

          const { data: pkgData, error: pkgError } = await supabase
            .from('course_packages')
            .select(`
              id, instructor_id, total_hours,
              courses:course_id ( name, type ),
              accounts:account_id (
                clients:client_id ( 
                  id, notes,
                  profiles:profile_id ( first_name, last_name, avatar_url, email, phone )
                )
              ),
              lessons ( duration, status )
            `)
            .eq('status', 'active')
          
          if (pkgError) throw pkgError

          if (pkgData) {
            const processed = pkgData.map(pkg => {
              const rawClient = (pkg.accounts as any)?.clients;
              // Handle potential array response from Supabase join
              const profileData = Array.isArray(rawClient?.profiles) ? rawClient.profiles[0] : rawClient?.profiles;
              
              return {
                ...pkg,
                accounts: {
                  clients: {
                    ...rawClient,
                    name: profileData?.first_name || 'Unknown',
                    last_name: profileData?.last_name || '',
                    avatar_url: profileData?.avatar_url,
                    email: profileData?.email,
                    phone: profileData?.phone
                  }
                },
                remaining: pkg.total_hours - (pkg.lessons?.filter((l: any) => l.status === 'completed').reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0) || 0)
              }
            })
            setPackages(processed)
          }
        } catch (err: any) {
          toast.error("Database error")
        }
      }
      fetchData()

      if (editLesson) {
        const dateObj = parseISO(editLesson.session_date)
        setSelectedPackageId(editLesson.course_package_id)
        setLessonDate(format(dateObj, "yyyy-MM-dd"))
        setSelectedHour(format(dateObj, "HH"))
        setSelectedMinute(format(dateObj, "mm"))
        setDuration(editLesson.duration?.toString() || "2")
        setLocationId(editLesson.location_id || "")
        setSummary(editLesson.summary || "")
        setStatus(editLesson.status || 'planned')
      }
    }
  }, [isOpen, editLesson])

  const filteredPackages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return packages
    return packages.filter(p => 
      `${p.accounts?.clients?.name} ${p.accounts?.clients?.last_name}`.toLowerCase().includes(q)
    )
  }, [packages, searchQuery])

  const filteredLocations = useMemo(() => {
    if (!selectedPkg) return locations
    const courseType = (selectedPkg.courses as any)?.type 
    return locations.filter(loc => loc.type === courseType || loc.type === 'General')
  }, [locations, selectedPkg])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackageId) return toast.error(t("selectStudentError"))
    
    setLoading(true)
    const [year, month, day] = lessonDate.split('-').map(Number)
    const finalDate = new Date(year, month - 1, day, parseInt(selectedHour), parseInt(selectedMinute))

    const payload = {
      course_package_id: selectedPackageId,
      instructor_id: instructorId,
      duration: parseFloat(duration),
      session_date: finalDate.toISOString(),
      location_id: locationId || null,
      summary,
      status,
      created_by_profile_id: authProfile?.id
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
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-[#0A0A0A] border-t md:border border-white/10 w-full max-w-lg rounded-t-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 md:hidden" />

        {/* HEADER */}
        <div className="px-6 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
               <CalendarIcon size={20} />
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-white leading-none">
              {editLesson ? t('editLesson') : t('scheduleLesson')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-white rounded-full transition-all border border-white/10">
            <X size={24} />
          </button>
          
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* STUDENT SELECTION */}
          <div className="space-y-3 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('selectStudent')}</label>
            <div className="relative group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                autoComplete="off"
                placeholder={selectedPkg ? `${selectedPkg.accounts.clients.name} ${selectedPkg.accounts.clients.last_name}` : t('searchStudent')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-primary transition-all outline-none"
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
              />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 w-full top-full mt-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl max-h-[200px] overflow-y-auto p-2">
                {filteredPackages.map(p => (
                  <button 
                    key={p.id} type="button" 
                    className={`w-full flex items-center justify-between p-3 rounded-xl mb-1 ${p.id === selectedPackageId ? 'bg-primary/20 border border-primary/40' : 'hover:bg-white/5 border border-transparent'}`}
                    onClick={() => { setSelectedPackageId(p.id); setSearchQuery(""); setIsDropdownOpen(false); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {p.accounts?.clients?.name?.[0]}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-white">{p.accounts?.clients?.name} {p.accounts?.clients?.last_name}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold italic">{(p.courses as any)?.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-primary italic">{p.remaining}h</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QUICK INFO PANEL (Synced with Dossier Modal) */}
          {clientData && (
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-primary/30 overflow-hidden bg-black shrink-0">
                    {clientData.avatar_url ? (
                      <img 
                        src={clientData.avatar_url.startsWith('http') 
                          ? clientData.avatar_url 
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/avatars/${clientData.avatar_url}`} 
                        className="w-full h-full object-cover" 
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/40"><User size={20} /></div>
                    )}
                  </div>
                  <div className="leading-tight">
                    <h3 className="text-sm font-black text-white uppercase italic">{clientData.name} {clientData.last_name}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-primary font-black tabular-nums uppercase">
                       <Clock size={10} /> {selectedPkg.remaining}h {t('hoursLeft')}
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => onOpenDossier(clientData)} 
                  className="p-3 bg-primary text-black rounded-xl hover:bg-white transition-all shadow-lg active:scale-90"
                >
                  <Contact2 size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STATUS SELECTOR */}
          <div className="grid grid-cols-3 gap-2">
            {(['planned', 'completed', 'cancelled'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={`py-3 rounded-xl font-black text-[10px] uppercase border transition-all ${status === s ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                {t(s)}
              </button>
            ))}
          </div>

          {/* DATE & TIME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('date')}</label>
              <div className="relative">
                <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary [color-scheme:dark]" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
                <CalendarIcon size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('time')} (24H)</label>
              <div className="flex gap-2">
                <select value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary appearance-none text-center font-black">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')} className="bg-black">{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="flex items-center text-primary font-black">:</div>
                <select value={selectedMinute} onChange={(e) => setSelectedMinute(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary appearance-none text-center font-black">
                  {["00", "15", "30", "45"].map((m) => (
                    <option key={m} value={m} className="bg-black">{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DURATION PRESETS */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('duration')}</label>
            <div className="grid grid-cols-4 gap-2">
              {["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4"].map((val) => (
                <button key={val} type="button" onClick={() => setDuration(val)} className={`py-3 rounded-xl font-black text-xs border transition-all ${duration === val ? 'bg-primary text-black border-primary shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {val}h
                </button>
              ))}
            </div>
          </div>

          {/* LOCATION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('location')}</label>
            <div className="relative">
              <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary appearance-none" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="" className="bg-black">{t('selectLocation')}</option>
                {filteredLocations.map(loc => (
                  <option key={loc.id} value={loc.id} className="bg-black">{loc.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* NOTES */}
          <div className="relative">
            <textarea placeholder={t('notesPlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary min-h-[80px] resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <FileText size={16} className="absolute right-5 top-4 text-slate-500" />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex gap-3 pt-2 pb-safe-bottom-mobile">
            {editLesson && (
              <button type="button" onClick={handleDelete} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={22} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 py-5 bg-primary text-black font-black uppercase rounded-2xl hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={4} />}
              {editLesson ? t('update') : t('confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}