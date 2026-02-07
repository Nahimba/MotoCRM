"use client"

import "./globals.css"
import { useState, useRef, useEffect } from "react"
import { 
  Home, Users, PlusCircle, Wallet, Settings, 
  LogOut, BookOpen, GraduationCap, ChevronUp,
  User, Shield
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Toaster } from "sonner"

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { profile, signOut, loading } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  
  const isLoginPage = pathname === "/"

  // 1. Check permissions safely
  const role = profile?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isStaff = role === 'staff';
  const isInternal = isAdmin || isInstructor || isStaff;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (loading && !isLoginPage) {
    return (
      <body className="bg-black flex items-center justify-center h-screen font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 animate-pulse">Initializing Raceway OS...</span>
        </div>
      </body>
    )
  }

  return (
    <body className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      <Toaster position="top-center" theme="dark" />
      
      {!isLoginPage && (
        <aside className="hidden md:flex w-64 border-r bg-[#0a0a0a] flex-col shrink-0 border-white/5 relative">
          <div className="p-6 border-b border-white/5">
            <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase leading-none">
              RACEWAY<span className="text-primary">CRM</span>
            </h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem href="/dashboard" icon={<Home size={18}/>} label="Dashboard" active={pathname === '/dashboard'} />
            <NavItem href="/dashboard/courses" icon={<BookOpen size={18}/>} label="Courses" active={pathname === '/dashboard/courses'} />
            
            {/* Show Instructors to Admin & Staff */}
            {(isAdmin || isInstructor || isStaff) && (
              <NavItem href="/dashboard/instructors" icon={<GraduationCap size={18}/>} label="Instructors" active={pathname === '/dashboard/instructors'} />
            )}
            
            {/* Show Clients to Admin & Staff */}
            {isInternal && (
              <NavItem href="/dashboard/clients" icon={<Users size={20}/>} label="Clients" active={pathname === '/dashboard/clients'} />
            )}

            {/* Show Finance ONLY to Admin */}
            {isAdmin && (
              <NavItem href="/dashboard/finance" icon={<Wallet size={18}/>} label="Finance" active={pathname === '/dashboard/finance'} />
            )}
          </nav>

          <div className="p-4 border-t border-white/5 space-y-2" ref={settingsRef}>
             {/* SETTINGS POPUP */}
             {showSettings && (
              <div className="absolute bottom-32 left-4 right-4 bg-[#111] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest">
                  <User size={14} /> My Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest">
                  <Shield size={14} /> Security
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${showSettings ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <Settings size={18} className={showSettings ? "text-primary rotate-45 transition-transform" : ""} />
                <span className="font-bold text-sm tracking-tight tracking-tighter">Settings</span>
              </div>
              <ChevronUp size={14} className={`transition-transform duration-300 ${showSettings ? 'rotate-180' : ''}`} />
            </button>

            <button 
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all font-bold text-sm tracking-tight cursor-pointer"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 relative">
        {!isLoginPage && (
          <header className="h-16 border-b border-white/5 bg-card/50 backdrop-blur-md flex items-center px-6 md:px-8 justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
               {/* DEV MODE INDICATOR */}
               <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-primary uppercase">Dev Mode: {role || 'Unknown'}</span>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-bold text-slate-500 hidden sm:block uppercase tracking-widest italic">{profile?.full_name}</span>
               <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-black text-xs shadow-[0_0_20px_rgba(255,165,0,0.2)]">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
            </div>
          </header>
        )}

        <div className={`flex-1 overflow-y-auto ${!isLoginPage ? 'p-4 md:p-8' : ''}`}>
          <div className={!isLoginPage ? "max-w-6xl mx-auto" : ""}>
            {children}
          </div>
        </div>
      </main>
    </body>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </html>
  )
}

function NavItem({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${active ? 'bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(255,165,0,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      <span className={active ? 'text-primary' : 'text-slate-500 group-hover:text-primary transition-colors'}>
        {icon}
      </span>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </Link>
  )
}