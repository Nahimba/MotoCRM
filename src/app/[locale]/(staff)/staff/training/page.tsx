"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, Search, User } from "lucide-react"
import TrainingDashboardView from "@/components/training/TrainingDashboardView"

function StaffTrainingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get("studentId")

  const [packages, setPackages] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Пошук студентів з дебаунсом
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'rider')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(7)

      setSearchResults(data || [])
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // Завантаження даних конкретного студента
  useEffect(() => {
    if (!studentId) return

    const fetchStudentData = async () => {
      setLoading(true)
      try {
        const [detailsRes, lessonsRes] = await Promise.all([
          supabase
            .from('client_training_details')
            .select('*')
            .eq('profile_id', studentId)
            .order('package_status', { ascending: true }),
          supabase
            .from('client_lessons_log')
            .select('*')
            .eq('profile_id', studentId)
            .order('session_date', { ascending: false })
        ])

        setPackages(detailsRes.data || [])
        setLessons(lessonsRes.data || [])
      } catch (err) {
        console.error("Staff Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [studentId])

  const handleSelectStudent = (id: string) => {
    setSearchQuery("")
    setSearchResults([])
    router.push(`/staff/training?studentId=${id}`)
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-md mx-auto px-6 pt-8 relative z-50">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Пошук студента..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-primary" size={16} />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-primary hover:text-black transition-colors text-left group/item"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-black/10">
                    <User size={14} />
                  </div>
                  <span className="text-sm font-black uppercase italic tracking-tighter">
                    {s.first_name} {s.last_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Оновлення даних...</p>
        </div>
      ) : studentId ? (
        <TrainingDashboardView packages={packages} lessons={lessons} isStaff={true} />
      ) : (
        <div className="max-w-md mx-auto px-6 pt-20 text-center">
          <div className="p-12 border border-dashed border-white/10 rounded-[3rem]">
            <Search className="mx-auto text-slate-800 mb-4" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 leading-relaxed">
              Знайдіть студента,<br />щоб побачити його статистику
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Потрібно обгорнути в Suspense через useSearchParams
export default function StaffStudentTrainingPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen" />}>
      <StaffTrainingContent />
    </Suspense>
  )
}