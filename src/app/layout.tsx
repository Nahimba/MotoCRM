import "./globals.css"
import { Home, Users, PlusCircle, Wallet, Settings, LogOut } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "MotoCRM | Garage Terminal",
  description: "High-performance client management",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-background text-foreground">
        
        {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
        <aside className="hidden md:flex w-64 border-r bg-sidebar flex-col shrink-0 border-white/5">
          <div className="p-6 border-b border-white/5">
            <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
              MOTO<span className="text-primary">CRM</span>
            </h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem href="/dashboard" icon={<Home size={18}/>} label="Dashboard" />
            <NavItem href="/clients" icon={<Users size={20}/>} label="Clients" />
            <NavItem href="/packages/new" icon={<PlusCircle size={18}/>} label="Sell Package" />
            <NavItem href="/finance" icon={<Wallet size={18}/>} label="Finance" />
          </nav>

          <div className="p-4 border-t border-white/5">
            <NavItem href="/settings" icon={<Settings size={18}/>} label="Settings" />
            <button className="w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium">
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 relative pb-20 md:pb-0">
          {/* HEADER */}
          <header className="h-16 border-b border-white/5 bg-card/50 backdrop-blur-md flex items-center px-6 md:px-8 justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
              {/* Mobile Branding */}
              <h1 className="md:hidden text-xl font-black italic tracking-tighter text-foreground uppercase">
                MOTO<span className="text-primary">CRM</span>
              </h1>
              {/* Status Indicator */}
              <div className="hidden md:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Online</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <span className="text-sm font-medium text-slate-400 italic hidden sm:inline">V. Zavgorodnii</span>
               <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-black text-xs">VZ</div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>

          {/* MOBILE BOTTOM NAV (Visible only on Mobile) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-white/10 px-6 py-3 flex justify-between items-center z-50 pb-safe">
            <MobileTab href="/dashboard" icon={<Home size={22}/>} label="Home" />
            <MobileTab href="/clients" icon={<Users size={22}/>} label="Clients" />
            
            {/* Center Action Button */}
            <div className="relative -top-6">
                <Link href="/packages/new" className="bg-primary p-4 rounded-full shadow-[0_0_20px_rgba(255,165,0,0.4)] block text-black active:scale-90 transition-transform">
                    <PlusCircle size={28} />
                </Link>
            </div>

            <MobileTab href="/finance" icon={<Wallet size={22}/>} label="Money" />
            <MobileTab href="/settings" icon={<Settings size={22}/>} label="Setup" />
          </nav>
        </main>
      </body>
    </html>
  )
}

/** * Desktop Navigation Link 
 */
function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
    >
      <span className="text-slate-500 group-hover:text-primary transition-colors">
        {icon}
      </span>
      <span className="font-semibold text-sm tracking-tight">{label}</span>
    </Link>
  )
}

/** * Mobile Navigation Tab 
 */
function MobileTab({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
      <Link href={href} className="flex flex-col items-center gap-1 text-slate-500 hover:text-primary active:scale-90 transition-all">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      </Link>
    )
}