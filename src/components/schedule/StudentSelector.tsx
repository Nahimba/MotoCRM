"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, Users, UserCheck } from "lucide-react"
import { useTranslations } from "next-intl"

interface StudentSelectorProps {
  packages: any[]
  selectedPackageId: string
  onSelect: (id: string) => void
  currentInstructorId: string | null
}

export function StudentSelector({ 
  packages, 
  selectedPackageId, 
  onSelect, 
  currentInstructorId 
}: StudentSelectorProps) {
  const t = useTranslations("Schedule")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Закрытие дропдауна при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 1. Сначала фильтруем по принадлежности к инструктору (если не включен режим "All")
  const instructorFiltered = useMemo(() => {
    if (showAllStudents) return packages
    return packages.filter(p => p.instructor_id === currentInstructorId)
  }, [packages, showAllStudents, currentInstructorId])

  // 2. Затем фильтруем по поисковому запросу
  const filteredPackages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return instructorFiltered
    return instructorFiltered.filter(p => 
      `${p.accounts?.clients?.name} ${p.accounts?.clients?.last_name}`
        .toLowerCase()
        .includes(q)
    )
  }, [instructorFiltered, searchQuery])

  const selectedPkg = useMemo(() => 
    packages.find(p => p.id === selectedPackageId), 
    [packages, selectedPackageId]
  )

  return (
    <div className="space-y-3 relative" ref={dropdownRef}>
      <div className="flex justify-between items-end px-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {t('selectStudent')}
        </label>
        
        {/* Переключатель Мои / Все */}
        <button
          type="button"
          onClick={() => setShowAllStudents(!showAllStudents)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
            showAllStudents 
              ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' 
              : 'bg-primary/10 border-primary/50 text-primary'
          }`}
        >
          {showAllStudents ? <Users size={12} /> : <UserCheck size={12} />}
          <span className="text-[9px] font-black uppercase italic">
            {showAllStudents ? 'All Packages' : 'My Students'}
          </span>
        </button>
      </div>

      <div className="relative group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input 
          type="text"
          autoComplete="off"
          placeholder={selectedPkg 
            ? `${selectedPkg.accounts.clients.name} ${selectedPkg.accounts.clients.last_name}` 
            : t('searchStudent')
          }
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-primary transition-all outline-none"
          value={searchQuery}
          onFocus={() => setIsDropdownOpen(true)}
          onChange={(e) => { 
            setSearchQuery(e.target.value)
            setIsDropdownOpen(true)
          }}
        />
      </div>

      {isDropdownOpen && (
        <div className="absolute z-50 w-full top-full mt-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl max-h-[250px] overflow-y-auto p-2 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
          {filteredPackages.length > 0 ? (
            filteredPackages.map(p => (
              <button 
                key={p.id} 
                type="button" 
                className={`w-full flex items-center justify-between p-3 rounded-xl mb-1 transition-all ${
                  p.id === selectedPackageId 
                    ? 'bg-primary/20 border border-primary/40' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
                onClick={() => { 
                  onSelect(p.id)
                  setSearchQuery("")
                  setIsDropdownOpen(false)
                }}
              >
                <div className="flex items-center gap-3">
                  {/* <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden">
                    {p.accounts?.clients?.avatar_url ? (
                      <img 
                        src={p.accounts.clients.avatar_url.startsWith('http') 
                          ? p.accounts.clients.avatar_url 
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/avatars/${p.accounts.clients.avatar_url}`
                        } 
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : p.accounts?.clients?.name?.[0]}
                  </div> */}
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-white">
                      {p.accounts?.clients?.name} {p.accounts?.clients?.last_name}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold italic">
                      {(p.courses as any)?.name}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-primary italic">{p.remaining}h</span>
                  {showAllStudents && p.instructor_id !== currentInstructorId && (
                    <span className="text-[7px] text-orange-500 font-bold uppercase">Substitute</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500 text-xs italic">
              No students found
            </div>
          )}
        </div>
      )}
    </div>
  )
}