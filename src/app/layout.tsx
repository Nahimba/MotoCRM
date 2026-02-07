import "./globals.css"
import { Home, Users, PlusCircle, Wallet, Settings, LogOut } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "MotoCRM | Garage Terminal",
  description: "High-performance rider management",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 border-r bg-sidebar flex flex-col shrink-0">
          <div className="p-6 border-b border-white/5">
            {/* CHANGED COLORS HERE */}
            <h1 className="text-2xl font-black italic tracking-tighter text-foreground">
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
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <header className="h-16 border-b border-white/5 bg-card/50 backdrop-blur-md flex items-center px-8 justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">System Online</span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm font-medium text-slate-400 italic">User</span>
               <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-black text-xs">US</div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}

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