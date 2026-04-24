"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, Users, UserCheck, Plus, Zap, CheckCircle2, ChevronDown, Tag } from "lucide-react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"

interface StudentSelectorPlusProps {
  packages: any[]
  selectedPackageId: string
  selectedClientId: string | null
  setSelectedClientId: (id: string) => void
  setSelectedPackageId: (id: string) => void
  onSelectQuickMode: (clientId: string | null, courseId: string, customPrice?: number) => void
  currentInstructorId: string | null
}

export function StudentSelectorPlus({ 
  packages, 
  selectedPackageId, 
  selectedClientId,
  setSelectedClientId,
  setSelectedPackageId,
  onSelectQuickMode,
  currentInstructorId 
}: StudentSelectorPlusProps) {
  const t = useTranslations("Schedule")
  
  const [showAllStudents, setShowAllStudents] = useState(false)
  const [isQuickMode, setIsQuickMode] = useState(false)
  
  const [isStudentOpen, setIsStudentOpen] = useState(false)
  const [isPackageOpen, setIsPackageOpen] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  
  // Quick Mode States
  const [courses, setCourses] = useState<any[]>([])
  const [selectedQuickCourse, setSelectedQuickCourse] = useState<any>(null)
  const [isCustomPrice, setIsCustomPrice] = useState(false)
  const [price, setPrice] = useState<number | string>(0)

  const studentRef = useRef<HTMLDivElement>(null)
  const packageRef = useRef<HTMLDivElement>(null)

  // Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .eq('allow_quick_creation', true)
      if (data) setCourses(data)
    }
    fetchCourses()
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (studentRef.current && !studentRef.current.contains(e.target as Node)) setIsStudentOpen(false)
      if (packageRef.current && !packageRef.current.contains(e.target as Node)) setIsPackageOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const uniqueStudents = useMemo(() => {
    const baseList = showAllStudents 
      ? packages 
      : packages.filter(p => p.instructor_id === currentInstructorId);
    
    const map = new Map();
    baseList.forEach(p => {
      const client = p.accounts?.clients;
      if (client && !map.has(client.id)) map.set(client.id, client);
    });

    const students = Array.from(map.values());
    if (!studentSearch) return students;
    
    return students.filter(s => 
      `${s.name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [packages, showAllStudents, currentInstructorId, studentSearch]);

  const studentPackages = useMemo(() => {
    if (!selectedClientId) return [];
    return packages.filter(p => p.accounts?.clients?.id === selectedClientId);
  }, [packages, selectedClientId]);

  // This should always look at the raw data, never the filtered 'uniqueStudents'
  const selectedStudent = useMemo(() => {
    if (!selectedClientId || packages.length === 0) return null;
    
    // Look through ALL packages, ignoring who the instructor is
    const pkg = packages.find(p => p.accounts?.clients?.id === selectedClientId);
    return pkg?.accounts?.clients || null;
  }, [selectedClientId, packages]);

  const selectedPkg = useMemo(() => 
    packages.find(p => p.id === selectedPackageId),
    [packages, selectedPackageId]
  )

  // Sync price with parent whenever it changes
  useEffect(() => {
    if (isQuickMode && selectedQuickCourse && selectedClientId) {
      // Fallback to 0 if price is currently an empty string
      const finalPrice = price === "" ? 0 : Number(price);
      onSelectQuickMode(selectedClientId, selectedQuickCourse.id, finalPrice);
    }
  }, [price, isQuickMode, selectedQuickCourse, selectedClientId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          {t('selectStudent')}
          {(selectedPackageId || isQuickMode) && <CheckCircle2 size={12} className="text-primary animate-pulse" />}
        </label>
        
        <button
          type="button"
          onClick={() => setShowAllStudents(!showAllStudents)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
            showAllStudents 
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}
        >
          {showAllStudents ? <Users size={12} /> : <UserCheck size={12} />}
          <span className="text-[9px] font-black uppercase italic tracking-tight">
            {showAllStudents ? 'Всі активні' : 'Мої учні'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Dropdown */}
        <div className="relative" ref={studentRef}>
          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Учень</label>
          <div 
            onClick={() => setIsStudentOpen(!isStudentOpen)}
            className={`w-full bg-white/5 border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${
              isStudentOpen ? 'border-primary ring-4 ring-primary/5' : 'border-white/10 hover:bg-white/10'
            }`}
          >
            <span className={`text-[13px] font-black uppercase italic ${selectedStudent ? 'text-white' : 'text-slate-500'}`}>
              {selectedStudent ? `${selectedStudent.name} ${selectedStudent.last_name}` : "Оберіть учня..."}
            </span>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isStudentOpen ? 'rotate-180' : ''}`} />
          </div>

          {isStudentOpen && (
            <div className="absolute z-[120] w-full mt-2 bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-2 border-b border-white/5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    autoFocus
                    className="w-full bg-white/5 border-none rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none"
                    placeholder="Пошук..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                {uniqueStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedClientId(student.id);
                      setSelectedPackageId("");
                      setIsQuickMode(false);
                      setSelectedQuickCourse(null);
                      setIsStudentOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-primary hover:text-black transition-all group"
                  >
                    <p className="text-[12px] font-black uppercase italic tracking-tight">
                      {student.name} {student.last_name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Package/Course Dropdown */}
        <div className="relative" ref={packageRef}>
          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Курс / Пакет</label>
          <div 
            onClick={() => selectedClientId && setIsPackageOpen(!isPackageOpen)}
            className={`w-full bg-white/5 border rounded-2xl p-4 flex items-center justify-between transition-all ${
              !selectedClientId ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
            } ${isPackageOpen ? 'border-primary ring-4 ring-primary/5' : 'border-white/10'}`}
          >
            <span className={`text-[13px] font-black uppercase italic ${selectedPackageId || isQuickMode ? 'text-white' : 'text-slate-500'}`}>
              {isQuickMode ? `⚡ ${selectedQuickCourse?.name}` : selectedPkg ? `${selectedPkg.courses?.name}` : "Оберіть курс..."}
            </span>
            <div className="flex items-center gap-2">
              {selectedPkg && <span className="text-[10px] font-black text-primary italic bg-primary/10 px-2 py-0.5 rounded-lg">{selectedPkg.remaining}г</span>}
              <ChevronDown size={16} className="text-slate-500" />
            </div>
          </div>

          {isPackageOpen && (
            <div className="absolute z-[110] w-full mt-2 bg-[#0F0F0F]/95 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-1 max-h-[250px] overflow-y-auto custom-scrollbar">
                {studentPackages.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      setIsQuickMode(false);
                      setIsPackageOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary hover:text-black transition-all group"
                  >
                    <span className="text-[11px] font-black uppercase italic">{pkg.courses?.name}</span>
                    <span className="text-[10px] font-black italic">{pkg.remaining}г</span>
                  </button>
                ))}

                <div className="mt-1 pt-1 border-t border-white/5">
                  <p className="px-3 py-2 text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap size={10} fill="currentColor" /> Швидкий запис
                  </p>
                  {courses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => {
                        if (!selectedClientId) return;
                        setSelectedQuickCourse(course);
                        // Logic: Discounted > Base
                        const defaultPrice = course.discounted_price || course.base_price;
                        setPrice(defaultPrice);
                        setIsCustomPrice(false);
                        setIsQuickMode(true);
                        setSelectedPackageId("");
                        setIsPackageOpen(false);
                        onSelectQuickMode(selectedClientId, course.id, defaultPrice);
                      }}
                      className="w-full text-left p-3 rounded-xl hover:bg-amber-500 hover:text-black transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase italic">+ {course.name}</span>
                        {course.discounted_price && (
                           <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">Акція</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Controls for Quick Mode */}
      {isQuickMode && selectedQuickCourse && (
        <div className="p-4 bg-[#1A1A1A] border border-amber-500/20 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black">
                <Zap size={14} fill="currentColor" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-tighter">Швидкий режим</span>
                <span className="text-[11px] text-white/60 font-bold italic">{selectedQuickCourse.name}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const newMode = !isCustomPrice;
                setIsCustomPrice(newMode);
                if (!newMode) {
                  // Revert to automatic price
                  setPrice(selectedQuickCourse.discounted_price || selectedQuickCourse.base_price);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                isCustomPrice ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              <Tag size={12} />
              <span className="text-[9px] font-black uppercase italic">Своя ціна</span>
            </button>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-white/5">
            <div className="flex-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">Вартість пакета (грн)</label>
              <div className="relative">
                {/* <DollarSign size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isCustomPrice ? 'text-primary' : 'text-slate-500'}`} /> */}
                <input 
                  type="number"
                  disabled={!isCustomPrice}
                  value={price}
                  onChange={(e) => {
                    const val = e.target.value;
                    // If input is empty, set to empty string so user can type. Otherwise, convert to number.
                    setPrice(val === "" ? "" : Number(val));
                  }}
                  className={`w-full bg-white/5 border rounded-xl py-2 pl-9 pr-4 text-xs font-black outline-none transition-all ${
                    isCustomPrice ? 'border-primary ring-2 ring-primary/10 text-white' : 'border-white/5 text-slate-500 opacity-50'
                  }`}
                />
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Стандарт</label>
              <div className="flex flex-col items-end">
                {selectedQuickCourse.discounted_price ? (
                  <>
                    <span className="text-[12px] font-black text-white italic">{selectedQuickCourse.discounted_price} грн</span>
                    <span className="text-[9px] font-bold text-slate-500 line-through tracking-tighter">{selectedQuickCourse.base_price} грн</span>
                  </>
                ) : (
                  <span className="text-xs font-black text-white italic">{selectedQuickCourse.base_price} грн</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}