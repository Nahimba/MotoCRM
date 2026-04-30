// app/uk/training/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import TrainingDashboardView from "@/components/training/TrainingDashboardView"

export default function ClientTrainingPage() {
  const { profile } = useAuth()
  const [details, setDetails] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    const fetchTrainingData = async () => {
      setLoading(true)
      try {
        const { data: detailsData } = await supabase
          .from('client_training_details')
          .select('*')
          .eq('profile_id', profile.id)
          .order('package_status', { ascending: true })

        if (detailsData && detailsData.length > 0) {
          setDetails(detailsData.find(p => p.package_status === 'active') || detailsData[0])
        }

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
  }, [profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return <TrainingDashboardView details={details} lessons={lessons} />
}