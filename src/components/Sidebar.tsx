'use client';

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter, Link } from '@/i18n/routing';
import { 
  LogOut, Home, Users, BarChart3, ShieldCheck, 
  User, Settings, Bike, 
  GraduationCap, Calendar, MoreHorizontal,
  LayoutDashboard, ClipboardList, ChevronUp, Languages,
  Package, Banknote 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from "@/lib/supabase" // Ensure this is imported

export default function Sidebar() {
  const t = useTranslations('Sidebar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading, signOut } = useAuth();
  
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const settingsRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // --- Avatar Resolution Logic ---
  useEffect(() => {
    async function resolveAvatar() {
      const rawAvatar = profile?.avatar_url
      if (!rawAvatar) {
        setAvatarPreview(null)
        return
      }

      if (rawAvatar.startsWith('http')) {
        setAvatarPreview(rawAvatar)
      } else {
        // MATCHING THE MODAL LOGIC:
        // Bucket: 'avatars'
        // Path: 'avatars/filename'
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(`avatars/${rawAvatar}`) // Added the avatars/ prefix here
        
        setAvatarPreview(data.publicUrl)
      }
    }

    resolveAvatar()
  }, [profile?.avatar_url])

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'ru' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setShowSettings(false)
    setShowMobileMenu(false)
  }, [pathname])

  if (loading) return null;
  const role = profile?.role || 'rider';

  return (
    <>
      {/* --- DESKTOP SIDEBAR (PC) --- */}
      <aside className="hidden lg:flex w-64 bg-[#0a0a0a] text-white h-screen p-6 fixed left-0 top-0 border-r border-white/5 flex-col z-[100]">
        <div className="mb-10 flex items-center gap-3 px-2">
          <Bike className="text-primary" size={24} />
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
            MOTO<span className="text-primary">CRM</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
          {role === 'admin' && (
            <>
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 mt-4 px-4">
                {t('director')}
              </div>
              <SidebarLink href="/admin" icon={<ShieldCheck size={16}/>} label={t('overview')} active={pathname === '/admin'} />
              <SidebarLink href="/admin/finances" icon={<BarChart3 size={16}/>} label={t('finances')} active={pathname.startsWith('/admin/finances')} />
              <SidebarLink href="/admin/courses" icon={<Package size={16}/>} label={t('courses')} active={pathname.startsWith('/admin/courses')} />
              <SidebarLink href="/admin/instructors" icon={<Users size={16}/>} label={t('staff')} active={pathname.startsWith('/admin/instructors')} />
            </>
          )}

          {(role === 'admin' || role === 'instructor') && (
            <>
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 mt-6 px-4">
                {t('staffHome')}
              </div>
              <SidebarLink href="/staff" icon={<ClipboardList size={16}/>} label={t('lessons') || 'Lessons'} active={pathname === '/staff'} />
              <SidebarLink href="/staff/schedule" icon={<Calendar size={16}/>} label={t('schedule')} active={pathname.startsWith('/staff/schedule')} />
              <SidebarLink href="/staff/clients" icon={<GraduationCap size={16}/>} label={t('roster')} active={pathname.startsWith('/staff/clients')} />
              <SidebarLink href="/staff/packages" icon={<Bike size={16}/>} label={t('packages')} active={pathname.startsWith('/staff/packages')} />
              <SidebarLink href="/staff/payments" icon={<Banknote size={16}/>} label={t('payments') || 'Payments'} active={pathname.startsWith('/staff/payments')} />
            </>
          )}

          {(role === 'rider') && (
            <>
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 mt-6 px-4">
                {t('clientHome') || 'Tactical'}
              </div>
              <SidebarLink href="/account" icon={<LayoutDashboard size={16}/>} label={t('dashboard') || 'Dashboard'} active={pathname === '/account'} />
              <SidebarLink href="/account/training" icon={<ClipboardList size={16}/>} label={t('trainingLog') || 'Log'} active={pathname.startsWith('/account/training')} />
            </>
          )}
        </nav>

        <div className="pt-6 border-t border-white/5 mt-auto relative" ref={settingsRef}>
          {showSettings && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#111] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <button 
                onClick={toggleLanguage}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-primary hover:bg-white/5 transition-all"
              >
                <Languages size={16} />
                <span className="text-xs font-bold uppercase italic">
                  {locale === 'en' ? 'Русский' : 'English'}
                </span>
              </button>

              <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <User size={16} />
                <span className="text-xs font-bold uppercase italic">{t('profile')}</span>
              </Link>

              <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all">
                <LogOut size={16} />
                <span className="text-xs font-bold uppercase italic">{t('signOut')}</span>
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${showSettings ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className={showSettings ? "rotate-90 transition-transform" : ""} />
              <span className="font-bold text-sm italic uppercase">{t('settings')}</span>
            </div>
            <ChevronUp size={16} className={showSettings ? "rotate-180 transition-transform" : ""} />
          </button>
        </div>
      </aside>

      {/* --- MOBILE BOTTOM DOCK --- */}
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[200]" ref={mobileMenuRef}>
        <div className="relative w-full">
          {showMobileMenu && (
            <div 
              className="absolute bottom-[115%] left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 shadow-2xl"
              style={{ animation: 'mobilePopUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            >
              <div className="grid grid-cols-3 gap-2">
                {role === 'admin' && (
                  <>
                    <MobileExtraLink href="/admin" icon={<ShieldCheck size={18}/>} label={t('overview')} />
                    <MobileExtraLink href="/admin/finances" icon={<BarChart3 size={18}/>} label={t('finances')} />
                    <MobileExtraLink href="/admin/instructors" icon={<GraduationCap size={18}/>} label={t('staff')} />
                  </>
                )}

                {(role === 'admin' || role === 'instructor') && (
                  <>
                    <MobileExtraLink href="/staff" icon={<ClipboardList size={18}/>} label={t('lessons') || 'Lessons'} />
                    <MobileExtraLink href="/staff/payments" icon={<Banknote size={18}/>} label={t('payments') || 'Payments'} />
                    <MobileExtraLink href="/staff/clients" icon={<Users size={18}/>} label={t('roster')} />
                  </>
                )}

                {role === 'rider' && (
                  <>
                    <MobileExtraLink href="/account" icon={<LayoutDashboard size={18}/>} label={t('dashboard') || 'Home'} />
                    <MobileExtraLink href="/account/training" icon={<ClipboardList size={18}/>} label={t('trainingLog') || 'Log'} />
                  </>
                )}

                <MobileExtraLink href="/profile" icon={<User size={18}/>} label={t('profile')} />

                <button 
                  onClick={toggleLanguage}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-3xl bg-white/5 text-primary active:scale-95 transition-all border border-white/5"
                >
                  <Languages size={18} />
                  <span className="text-[9px] font-black uppercase tracking-tight">
                    {locale === 'en' ? 'RU' : 'EN'}
                  </span>
                </button>

                <button onClick={() => signOut()} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-3xl bg-red-500/10 text-red-500 active:scale-95 transition-all border border-red-500/10">
                  <LogOut size={18} />
                  <span className="text-[9px] font-black uppercase tracking-tight">{t('exit')}</span>
                </button>
              </div>
            </div>
          )}

          <div className="w-full bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-[2.8rem] p-2 flex items-center justify-between shadow-2xl mb-[env(safe-area-inset-bottom)]">
            <MobileTab 
              href={
                role === 'admin' ? '/admin' : 
                role === 'instructor' ? '/staff' : 
                '/account'
              } 
              icon={<Home size={22}/>} 
              active={
                pathname === '/admin' || 
                pathname === '/staff' || 
                pathname === '/account'
              } 
            />
            
            {role === 'rider' ? (
               <MobileTab 
                href="/account/training" 
                icon={<ClipboardList size={22}/>} 
                active={pathname.startsWith('/account/training')} 
              />
            ) : (
              <MobileTab 
                href="/staff/schedule" 
                icon={<Calendar size={22}/>} 
                active={pathname.startsWith('/staff/schedule')} 
              />
            )}

            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)} 
              className={`flex-1 flex flex-col items-center justify-center py-4 transition-all ${showMobileMenu ? 'text-primary' : 'text-slate-500'}`}
            >
              <MoreHorizontal size={22} />
            </button>
            
            <Link href="/profile" className="flex-1 flex items-center justify-center">
              <div className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all ${pathname.startsWith('/profile') ? 'border-primary' : 'border-white/10'}`}>
                {/* --- Updated Avatar Rendering --- */}
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <User size={18} className="text-primary" />
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <style jsx global>{`
        @keyframes mobilePopUp {
          from { opacity: 0; transform: translateY(15px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
      `}</style>
    </>
  );
}


function SidebarLink({ href, icon, label, active }: { href: any; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? 'bg-primary text-black italic' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="text-[13px] font-bold uppercase tracking-tight">{label}</span>
    </Link>
  );
}

function MobileTab({ href, icon, active }: { href: any, icon: React.ReactNode, active: boolean }) {
  return (
    <Link href={href} className={`flex-1 flex items-center justify-center py-4 transition-all ${active ? 'text-primary' : 'text-slate-500'}`}>
      {icon}
    </Link>
  )
}

function MobileExtraLink({ href, icon, label }: { href: any, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-3xl bg-white/5 text-slate-300 active:scale-95 transition-all border border-white/5">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">{label}</span>
    </Link>
  )
}