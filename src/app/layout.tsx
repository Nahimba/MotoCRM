"use client"

import "./globals.css"
import { Home, Users, PlusCircle, Wallet, Settings, LogOut, BookOpen, GraduationCap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-background text-foreground">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-64 border-r bg-sidebar flex-col shrink-0 border-white/5">
          <div className="p-6 border-b border-white/5">
            <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
              RACEWAY<span className="text-primary">CRM</span>
            </h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem href="/dashboard" icon={<Home size={18}/>} label="Dashboard" active={pathname === '/dashboard'} />
            <NavItem href="/dashboard/courses" icon={<BookOpen size={18}/>} label="Courses" active={pathname === '/dashboard/courses'} />
            <NavItem href="/dashboard/instructors" icon={<GraduationCap size={18}/>} label="Instructors" active={pathname === '/dashboard/instructors'} />
            <NavItem href="/dashboard/clients" icon={<Users size={20}/>} label="Clients" active={pathname === '/dashboard/clients'} />
            <NavItem href="/dashboard/finance" icon={<Wallet size={18}/>} label="Finance" active={pathname === '/dashboard/finance'} />
          </nav>

          <div className="p-4 border-t border-white/5">
            <NavItem href="/settings" icon={<Settings size={18}/>} label="Settings" active={pathname === '/settings'} />
            <button className="w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium">
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0">
          <header className="h-16 border-b border-white/5 bg-card/50 backdrop-blur-md flex items-center px-6 md:px-8 justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
              <h1 className="md:hidden text-xl font-black italic tracking-tighter text-foreground uppercase">
                RACEWAY<span className="text-primary">CRM</span>
              </h1>
              <div className="hidden md:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Online</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-black text-xs">U</div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>

          {/* MOBILE BOTTOM NAV */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex justify-between items-center z-50 pb-safe">
            <MobileTab href="/dashboard" icon={<Home size={22}/>} label="Home" />
            <MobileTab href="/dashboard/courses" icon={<BookOpen size={22}/>} label="Courses" />
            
            <div className="relative -top-6">
                <Link href="/clients/new" className="bg-primary p-4 rounded-full shadow-[0_0_20px_rgba(255,165,0,0.4)] block text-black">
                    <PlusCircle size={28} />
                </Link>
            </div>

            <MobileTab href="/dashboard/instructors" icon={<GraduationCap size={22}/>} label="Team" />
            <MobileTab href="/dashboard/finance" icon={<Wallet size={22}/>} label="Money" />
          </nav>
        </main>
      </body>
    </html>
  )
}

function NavItem({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${active ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      <span className={active ? 'text-primary' : 'text-slate-500 group-hover:text-primary transition-colors'}>
        {icon}
      </span>
      <span className="font-semibold text-sm tracking-tight">{label}</span>
    </Link>
  )
}

function MobileTab({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
      <Link href={href} className="flex flex-col items-center gap-1 text-slate-500 active:text-primary transition-all">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
      </Link>
    )
}