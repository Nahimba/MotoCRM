// app/account/training/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import TrainingDashboardView from "@/components/training/TrainingDashboardView"

export default function ClientTrainingPage() {
  const { profile } = useAuth()
  const [packages, setPackages] = useState<any[]>([]) // Тепер це масив
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    const fetchTrainingData = async () => {
      setLoading(true)
      try {
        // 1. Отримуємо всі пакети курсів клієнта
        const { data: detailsData, error: detError } = await supabase
          .from('client_training_details')
          .select('*')
          .eq('profile_id', profile.id)
          .order('package_status', { ascending: true })

        if (detError) throw detError
        setPackages(detailsData || [])

        // 2. Отримуємо повну історію занять
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('client_lessons_log')
          .select('*')
          .eq('profile_id', profile.id) 
          .order('session_date', { ascending: false })

        if (lessonsError) throw lessonsError
        setLessons(lessonsData || [])

      } catch (err) {
        console.error("Dashboard Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrainingData()
  }, [profile?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Завантаження...</p>
      </div>
    )
  }

  return (
    <TrainingDashboardView 
      packages={packages} 
      lessons={lessons} 
      isStaff={profile?.role === 'staff' || profile?.role === 'admin'} 
    />
  )
}