'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, Home, Users, BookOpen, GraduationCap, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext'; // Import your hook
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const { profile, loading, signOut } = useAuth();
  const pathname = usePathname();

  // If we are still loading the profile from DB, don't render navigation yet
  // or render a skeleton so the UI doesn't "jump"
  if (loading) {
    return <div className="w-64 bg-[#0a0a0a] h-screen border-r border-white/5 animate-pulse" />;
  }

  return (
    <div className="w-64 bg-[#0a0a0a] text-white h-screen p-6 fixed left-0 top-0 border-r border-white/5 flex flex-col z-[100]">
      <div className="mb-10">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">
          RACEWAY<span className="text-primary">CRM</span>
        </h1>
      </div>

      <div className="flex-1 space-y-2">
        {/* DASHBOARD: Everyone sees this */}
        <SidebarLink href="/dashboard" icon={<Home size={18}/>} label="Dashboard" active={pathname === '/dashboard'} />

        {/* COURSES: Everyone sees this */}
        <SidebarLink href="/dashboard/courses" icon={<BookOpen size={18}/>} label="Courses" active={pathname === '/dashboard/courses'} />

        {/* INSTRUCTORS: Admin & Instructors only */}
        {(profile?.role === 'admin' || profile?.role === 'instructor') && (
          <SidebarLink href="/dashboard/instructors" icon={<GraduationCap size={18}/>} label="Instructors" active={pathname === '/dashboard/instructors'} />
        )}

        {/* CLIENTS: Admin, Instructors, and Staff */}
        {['admin', 'instructor', 'staff'].includes(profile?.role || '') && (
          <SidebarLink href="/dashboard/clients" icon={<Users size={18}/>} label="Clients" active={pathname === '/dashboard/clients'} />
        )}

        {/* FINANCE: Admin only */}
        {profile?.role === 'admin' && (
          <SidebarLink href="/dashboard/finance" icon={<Wallet size={18}/>} label="Finance" active={pathname === '/dashboard/finance'} />
        )}
      </div>

      {/* TERMINATE BUTTON */}
      <div className="pt-6 border-t border-white/5 mt-auto">
        <div
          onClick={signOut} // Use the clean signOut from AuthContext
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all cursor-pointer group select-none"
        >
          <LogOut size={18} className="group-hover:rotate-180 transition-transform duration-500" />
          <span className="text-[11px] font-black uppercase tracking-widest">Terminate Session</span>
        </div>
      </div>
    </div>
  );
}

// Helper component for clean code
function SidebarLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </Link>
  );
}