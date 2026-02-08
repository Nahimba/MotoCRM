'use client';

import { useState, useRef, useEffect } from "react"
import { usePathname } from 'next/navigation';
import { 
  LogOut, Home, Users, Wallet, ShieldCheck, 
  User, Settings, ChevronUp, Shield, Bike, GraduationCap, BookOpen 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Sidebar() {
  const { profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside settings popup to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (loading) return <div className="w-64 bg-[#0a0a0a] h-screen border-r border-white/5" />;

  const role = profile?.role || 'rider';

  // Reliable Sign Out Handler
  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Sign out protocol initiated");
    sessionStorage.setItem('manualLogout', 'true');
    await signOut();
  };

  return (
    <div className="w-64 bg-[#0a0a0a] text-white h-screen p-6 fixed left-0 top-0 border-r border-white/5 flex flex-col z-[100]">
      {/* BRANDING */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <Bike className="text-primary" size={24} />
        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
          MOTO<span className="text-primary">CRM</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {/* --- DIRECTOR SECTION (Admin Only) --- */}
        {role === 'admin' && (
          <>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 mt-4 px-4">Director</div>
            <SidebarLink href="/admin" icon={<ShieldCheck size={16}/>} label="Overview" active={pathname === '/admin'} />
            <SidebarLink href="/admin/finance" icon={<Wallet size={16}/>} label="Finance" active={pathname === '/admin/finance'} />
            <SidebarLink href="/admin/instructors" icon={<GraduationCap size={16}/>} label="Staff Mgmt" active={pathname === '/admin/instructors'} />
          </>
        )}

        {/* --- OPERATIONS SECTION (Admin & Instructors) --- */}
        {(role === 'admin' || role === 'instructor') && (
          <>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 mt-6 px-4">Operations</div>
            <SidebarLink href="/staff" icon={<Home size={16}/>} label="Command" active={pathname === '/staff'} />
            <SidebarLink href="/staff/clients" icon={<Users size={16}/>} label="Roster" active={pathname === '/staff/clients'} />
            {/* NEW LINK ADDED HERE */}
            <SidebarLink href="/staff/packages" icon={<BookOpen size={16}/>} label="Packages" active={pathname === '/staff/packages'} />
          </>
        )}

        {/* --- PILOT SECTION (Riders Only) --- */}
        {role === 'rider' && (
          <>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 mt-6 px-4">Pilot</div>
            <SidebarLink href="/account" icon={<Home size={16}/>} label="Overview" active={pathname === '/account'} />
          </>
        )}
      </nav>

      {/* FOOTER: SETTINGS & SIGN OUT */}
      <div className="pt-6 border-t border-white/5 mt-auto relative" ref={settingsRef}>
        
        {/* SETTINGS POPUP */}
        {showSettings && (
          <div className="absolute bottom-32 left-0 right-0 bg-[#111] border border-white/10 rounded-2xl p-2 shadow-2xl z-[110] animate-in fade-in slide-in-from-bottom-2">
            <Link 
              href="/profile"
              onClick={() => setShowSettings(false)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <User size={14} /> My Profile
            </Link>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest">
              <Shield size={14} /> Security
            </button>
          </div>
        )}

        {/* SETTINGS TOGGLE */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all mb-2 ${
            showSettings ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className={`transition-transform duration-500 ${showSettings ? "text-primary rotate-90" : ""}`} />
            <span className="font-bold text-sm tracking-tight">Settings</span>
          </div>
          <ChevronUp size={14} className={`transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`} />
        </button>

        {/* SIGN OUT BUTTON */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all cursor-pointer group outline-none border-none bg-transparent"
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-tight">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
        active 
          ? 'bg-primary text-black shadow-[0_0_20px_rgba(255,165,0,0.2)]' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-[13px] font-bold tracking-tight">{label}</span>
    </Link>
  );
}