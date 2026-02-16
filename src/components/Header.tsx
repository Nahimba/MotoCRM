"use client"

import { useAuth } from '@/context/AuthContext'
import { ThemeSwitcher } from '@/components/theme-toggle'

export default function Header() {
  const { profile } = useAuth()
  const role = profile?.role?.toLowerCase() || 'unknown'

  // Added "hidden md:flex" to the className
  return (
    <header className="hidden md:flex h-16 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md items-center px-8 justify-between shrink-0 z-10">
      <div className="flex items-center gap-4">
        {/* ROLE INDICATOR */}
        <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
            Mode: "{role}"
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <ThemeSwitcher />

        <div className="h-8 w-[1px] bg-white/5 mx-1" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none">
              {profile?.full_name || 'Pilot'}
            </span>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
              Verified Identity
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-black text-black text-xs border border-white/10 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            {profile?.full_name?.charAt(0) || 'P'}
          </div>
        </div>
      </div>
    </header>
  )
}