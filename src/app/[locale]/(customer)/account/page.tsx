"use client"

import { useEffect, useState } from "react"
import { 
  User, 
  Calendar, 
  Award, 
  CreditCard, 
  ChevronRight, 
  MapPin, 
  Zap,
  Clock
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setProfile(user)
    }
    getProfile()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            PILOT<span className="text-primary">PROFILE</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
            Callsign: {profile?.email?.split('@')[0] || 'Unknown'}
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
          <User className="text-primary" size={20} />
        </div>
      </header>

      {/* --- BENTO GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ACTION CARD: NEXT SESSION */}
        <div className="md:col-span-2 bg-[#111] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Calendar size={120} />
          </div>
          <div className="relative z-10">
            <span className="bg-primary text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Upcoming Session
            </span>
            <h2 className="text-4xl font-black mt-4 uppercase italic">Pro-Level Cornering</h2>
            <div className="flex flex-wrap gap-4 mt-6 text-slate-400 text-sm font-bold">
              <span className="flex items-center gap-2"><MapPin size={16}/> Track Alpha</span>
              <span className="flex items-center gap-2"><Clock size={16}/> Oct 12, 09:00</span>
            </div>
            <button className="mt-8 flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-primary transition-colors">
              Session Details <ChevronRight size={14}/>
            </button>
          </div>
        </div>

        {/* STAT CARD: CREDITS */}
        <div className="bg-[#111] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between">
          <CreditCard className="text-primary" size={32} />
          <div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Session Credits</p>
            <h3 className="text-5xl font-black italic">04</h3>
          </div>
          <button className="w-full border border-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
            Buy More
          </button>
        </div>

        {/* PROGRESS CARD */}
        <div className="bg-[#111] border border-white/5 rounded-[2rem] p-8">
          <div className="flex justify-between items-start mb-6">
            <Award className="text-yellow-500" size={32} />
            <span className="text-[10px] font-bold text-slate-500 italic">LEVEL 2 RIDER</span>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Skill Progression</p>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[65%]" />
          </div>
          <p className="text-right text-[10px] font-bold mt-2 text-primary">65% TO PRO</p>
        </div>

        {/* QUICK LINKS */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/5 p-6 rounded-[1.5rem] hover:bg-white/10 transition-colors cursor-pointer">
            <Zap className="text-blue-400 mb-3" size={24} />
            <h4 className="font-bold text-sm uppercase italic">Past Laps</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Review Performance</p>
          </div>
          <div className="bg-white/5 border border-white/5 p-6 rounded-[1.5rem] hover:bg-white/10 transition-colors cursor-pointer">
            <Calendar className="text-purple-400 mb-3" size={24} />
            <h4 className="font-bold text-sm uppercase italic">Booking</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Schedule Training</p>
          </div>
        </div>

      </div>
    </div>
  )
}