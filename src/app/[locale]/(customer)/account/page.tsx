"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  GraduationCap, 
  MessageSquare, 
  ArrowUpRight, 
  ShieldCheck, 
  User,
  Loader2,
  Bike
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

export default function ClientLandingPage() {
  const { profile } = useAuth()
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.id) return
      setLoading(true)
      try {
        const { data } = await supabase
          .from('client_training_details')
          .select('*')
          .eq('profile_id', profile.id)
          .order('package_status', { ascending: true })

        if (data) setPackages(data)
      } catch (err) {
        console.error("Dashboard Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 pb-24 text-white">
      {/* HEADER */}
      <header className="flex justify-between items-start pt-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            {packages[0]?.name || "Rider"} <span className="text-primary">.</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
            Личный кабинет студента
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
           <User className="text-slate-600" size={24} />
        </div>
      </header>

      {/* COURSES VERTICAL LIST */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 ml-2">
          <Bike size={14} className="text-primary" />
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            Ваши программы
          </h3>
        </div>

        {packages.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-white/10 rounded-[2rem] text-white italic opacity-50 text-sm">
            У вас пока нет активных курсов.
          </div>
        ) : (
          packages.map((item) => {
            const totalHours = Number(item.total_hours) || 0
            const remainingHours = Number(item.remaining_hours) || 0
            const progressPercent = totalHours > 0 ? ((totalHours - remainingHours) / totalHours) * 100 : 0

            return (
              <div 
                key={item.package_id}
                className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group hover:border-primary/20 transition-all duration-500"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                      {item.package_status === 'active' ? 'В процессе' : 'Завершен'}
                    </span>
                    <GraduationCap size={20} className="text-white/10 group-hover:text-primary/40 transition-colors" />
                  </div>

                  <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6 leading-tight max-w-[80%]">
                    {item.course_name}
                  </h2>

                  {/* PROGRESS SECTION */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-[10px] font-black uppercase italic tracking-tighter text-slate-400">
                      <span>Прогресс</span>
                      <span>{remainingHours} ч. осталось</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <Link 
                    href="/ru/account/training" 
                    className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-primary hover:text-black rounded-2xl transition-all duration-300 group/btn"
                  >
                    <span className="font-black uppercase italic text-[10px] tracking-widest">Детали обучения</span>
                    <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FOOTER INSTRUCTOR (Global or per course, keeping it here for quick access) */}
      <div className="p-6 bg-primary rounded-[2.5rem] text-black flex items-center justify-between shadow-[0_20px_40px_rgba(var(--primary),0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center font-black text-black border border-black/10 text-xl">
             {packages[0]?.lead_instructor_name?.charAt(0) || <ShieldCheck />}
          </div>
          <div>
            <p className="text-[9px] font-black text-black/50 uppercase tracking-widest">Поддержка</p>
            <p className="text-lg font-black italic uppercase tracking-tighter leading-none mt-1">
              Написать нам
            </p>
          </div>
        </div>
        <button className="p-4 bg-black text-white rounded-2xl hover:scale-105 active:scale-95 transition-all">
          <MessageSquare size={20} />
        </button>
      </div>
    </div>
  )
}