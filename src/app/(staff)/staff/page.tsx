"use client"

import { useEffect, useState } from "react"
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  ClipboardCheck,
  Flag
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function StaffDashboard() {
  const [sessions, setSessions] = useState([
    { id: 1, student: "Alex Rossi", time: "09:00", status: "Ready", level: "Intermediate" },
    { id: 2, student: "Marc Marquez", time: "10:30", status: "Upcoming", level: "Pro" },
  ])

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans">
      {/* --- STAFF HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Instructor Online</p>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tight">
            STAFF<span className="text-primary">COMMAND</span>
          </h1>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-[#111] border border-white/5 p-4 rounded-2xl text-center min-w-[100px]">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Daily Students</p>
            <p className="text-xl font-black">08</p>
          </div>
          <div className="bg-[#111] border border-white/5 p-4 rounded-2xl text-center min-w-[100px]">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Track Status</p>
            <p className="text-xl font-black text-primary italic underline underline-offset-4">HOT</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: ACTIVE SESSION / ROSTER --- */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Clock size={14} /> Today's Training Roster
          </h2>
          
          <div className="space-y-3">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="bg-[#111] border border-white/5 hover:border-primary/30 transition-all rounded-3xl p-6 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center font-black text-lg italic text-slate-400">
                    {session.time}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">
                      {session.student}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Curriculum: {session.level}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                      session.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-500'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <button className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-primary transition-all">
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- RIGHT: INSTRUCTOR TOOLS --- */}
        <div className="space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Instructor Tools</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <button className="flex items-center justify-between p-6 bg-primary text-black rounded-[2rem] font-black uppercase italic text-sm hover:scale-[1.02] transition-transform">
              Quick Evaluate <ClipboardCheck size={20} />
            </button>
            
            <button className="flex items-center justify-between p-6 bg-[#111] border border-white/10 rounded-[2rem] font-black uppercase italic text-sm hover:bg-white/5 transition-colors">
              Track Incidents <Flag size={20} className="text-red-500" />
            </button>

            <div className="p-8 bg-[#111] border border-white/5 rounded-[2.5rem]">
              <Users className="text-slate-500 mb-4" size={24} />
              <h4 className="font-black uppercase italic text-lg mb-2">My Students</h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                Access your full database of past riders and their skill history.
              </p>
              <button className="mt-6 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                View All <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}