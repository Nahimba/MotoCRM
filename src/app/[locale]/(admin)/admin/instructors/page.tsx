"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  UserPlus, X, Loader2, Settings, 
  RotateCcw, Archive, ShieldCheck, Mail, Phone as PhoneIcon 
} from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"


import UserAuthControl from "@/components/UserAuthControl"

interface StaffMember {
  id: string; // profile_id
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  last_synced_email: string | null;
  phone: string;
  role: 'admin' | 'staff'; // UI Role
  created_at: string;
  instructors: {
    id: string;
    is_active: boolean;
  } | null;
}

export default function HQStaffPage() {
  const t = useTranslations("admin.staff");
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  const [phoneValue, setPhoneValue] = useState("");

  async function fetchStaff() {
    setLoading(true);
    
    // 1. Прибираємо !inner, щоб дозволити профілі без записів в instructors (Left Join)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        auth_user_id,
        first_name, 
        last_name, 
        email, 
        last_synced_email,
        phone, 
        role, 
        created_at,
        instructors(id, is_active)
      `)
      .in('role', ['admin', 'instructor']) 
      .order('created_at', { ascending: false });
  
    if (error) {
      toast.error(error.message);
    } else {
      // 2. Оскільки ми прибрали фільтр в самому SQL (.eq('instructors.is_active', ...)),
      // ми маємо відфільтрувати архівних/активних локально або перевірити наявність об'єкта
      const filteredData = (data as any[]).filter(profile => {
        // Якщо це адмін і в нього немає запису в instructors — показуємо його як активного
        if (!profile.instructors) return view === 'active'; 
        
        // Для інших перевіряємо статус
        const isActive = Array.isArray(profile.instructors) 
          ? profile.instructors[0]?.is_active 
          : profile.instructors?.is_active;
          
        return view === 'active' ? isActive === true : isActive === false;
      });
  
      const mappedData = filteredData.map(profile => ({
        ...profile,
        role: profile.role === 'instructor' ? 'staff' : profile.role,
        instructors: Array.isArray(profile.instructors) ? profile.instructors[0] : profile.instructors
      }));
  
      setStaff(mappedData);
    }
    setLoading(false);
  }

  useEffect(() => { fetchStaff() }, [view]);

  const openEdit = (member: StaffMember) => {
    setEditingMember(member);
    setPhoneValue(member.phone ? formatDisplayPhone(member.phone) : ""); // Форматуємо при відкритті
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setPhoneValue("");
  };

  async function toggleAccess(member: StaffMember) {
    if (!confirm(t('notifications.archive_confirm'))) return;
    
    const instructorId = member.instructors?.id;
    if (!instructorId) return;

    const { error } = await supabase
      .from('instructors')
      .update({ is_active: view !== 'active' })
      .eq('id', instructorId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(view === 'active' ? t('notifications.archive_success') : t('notifications.restore_success'));
      fetchStaff();
    }
  }


  const formatDisplayPhone = (value: string) => {
    if (!value) return "";
    // Видаляємо все, крім цифр та плюса на початку
    const hasPlus = value.startsWith("+");
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return hasPlus ? "+" : "";
    // Якщо номер дуже короткий (менше 6 цифр), не форматируємо
    if (digits.length < 6) return hasPlus ? `+${digits}` : digits;
    let formatted = "";
    // Логіка: [Код країни] (Код міста/мережі) [Номер]
    // Працює за схемою: +XX (XXX) XXX XX XX...
    if (digits.length <= 10) {
      // Короткі міжнародні або локальні формати
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else {
      // Повний міжнародний стандарт (напр. +380 або +1)
      // Виділяємо перші 2 цифри як код країни для візуального комфорту
      formatted = `${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 14)}`;
    }
    return hasPlus ? `+${formatted.trim()}` : formatted.trim();
  };


  async function handleSaveStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);

    // 1. Очищення та валідація телефону
    const rawPhone = phoneValue.replace(/[^\d+]/g, ""); 
    if (rawPhone.length > 0) {
      const digitCount = rawPhone.replace(/\D/g, "").length;
      if (digitCount < 10) {
        toast.error("Номер занадто короткий або невірний");
        return;
      }
    }
    const phoneToSave = rawPhone || null; // Це те, що ми кладемо в базу

    // 2. Отримання інших полів
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    
    setIsSubmitting(true);

    const uiRole = formData.get('role') as string;
    const dbRole = uiRole === 'staff' ? 'instructor' : 'admin';

    try {
      // Створюємо об'єкт даних, щоб не дублювати його для insert/update
      const profileData = { 
        first_name: firstName, 
        last_name: lastName, 
        email, 
        phone: phoneToSave, // ВИКОРИСТОВУЄМО ОЧИЩЕНИЙ НОМЕР
        role: dbRole 
      };

      if (editingMember) {
        const { error: pErr } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', editingMember.id);
        
        if (pErr) throw pErr;
        toast.success(t('notifications.update_success'));
      } else {
        const newProfileId = crypto.randomUUID();
        
        const { error: pErr } = await supabase
          .from('profiles')
          .insert([{ id: newProfileId, ...profileData }]);
        if (pErr) throw pErr;

        const { error: iErr } = await supabase
          .from('instructors')
          .insert([{ 
            profile_id: newProfileId, 
            is_active: true,
            specialization: 'Both' 
          }]);
        if (iErr) throw iErr;

        toast.success(t('notifications.create_success'));
      }
      
      closeModal();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.code === '23505' ? t('notifications.error_duplicate') : error.message);
    } finally {
      setIsSubmitting(false);
    }
  }


  

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto mb-20">
      {/* HEADER */}
      <div className="flex flex-col gap-2 bg-[#0D0D0D] border border-white/5 p-5 md:p-8 rounded-[2rem] md:rounded-[3rem]">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-2xl font-black italic uppercase tracking-tighter text-white">
              {t('title')}<span className="text-primary">.</span>
            </h1>
            {/* <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('subtitle')}</p> */}
          </div>
          <button onClick={() => setShowModal(true)} className="md:hidden p-4 bg-primary text-black rounded-2xl transition-transform active:scale-95">
            <UserPlus size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div className="flex gap-6 border-b border-white/5 md:border-none pb-2">
            {(['active', 'archived'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2 ${
                  view === v ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {t(`roster_${v}`)}
                {view === v && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="hidden md:flex bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-[10px] items-center gap-3 hover:bg-primary transition-all active:scale-95">
            <UserPlus size={16} strokeWidth={3} /> {t('recruit_button')}
          </button>
        </div>
      </div>

      {/* STAFF GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-[10px] font-black uppercase text-slate-500">{t('loading')}</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-[3rem]">
          <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{t('no_staff')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {staff.map((member) => (
            <div key={member.id} className={`group bg-[#111] border rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 transition-all flex flex-col ${view === 'archived' ? 'opacity-50 grayscale border-white/5' : 'border-white/5 hover:border-primary/30'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl md:text-2xl text-primary uppercase italic">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                {view === 'active' && (
                  <button onClick={() => openEdit(member)} className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
                    <Settings size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-xl font-black uppercase italic text-white leading-tight">
                  {member.first_name} <span className="text-primary">{member.last_name}</span>
                </h3>
                <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  member.role === 'admin' 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-white/5 text-slate-400 border-white/5'
                }`}>
                  {t(`form.roles.${member.role}`)}
                </span>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-slate-600" />
                  <span className="text-[10px] font-bold text-slate-400 truncate uppercase">{member.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneIcon size={14} className="text-slate-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {member.phone ? formatDisplayPhone(member.phone) : "—"}
                  </span>
                </div>
              </div>

              <button onClick={() => toggleAccess(member)} className="mt-8 w-full py-4 text-[10px] font-black uppercase tracking-widest border border-white/5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-white">
                {view === 'active' ? <><Archive size={14} /> {t('actions.archive')}</> : <><RotateCcw size={14} /> {t('actions.restore')}</>}
              </button>
            </div>
          ))}
        </div>
      )}


      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={closeModal} />
          
          <form onSubmit={handleSaveStaff} className="relative w-full max-w-xl bg-[#0D0D0D] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-primary" size={24} />
                <h2 className="text-xl md:text-2xl font-black italic uppercase text-white">
                  {editingMember ? t('form.title_edit') : t('form.title_new')}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="p-2 text-slate-500 bg-white/5 rounded-full hover:text-white transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* ПЕРСОНАЛЬНІ ДАНІ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.first_name')}</label>
                  <input name="firstName" required defaultValue={editingMember?.first_name} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.last_name')}</label>
                  <input name="lastName" required defaultValue={editingMember?.last_name} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input name="email" type="email" required defaultValue={editingMember?.email} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:border-primary outline-none transition-all" />
                  </div>
                </div>
                {/* <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.phone')}</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input name="phone" defaultValue={editingMember?.phone} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:border-primary outline-none transition-all font-bold" />
                  </div>
                </div> */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.phone')}</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      name="phone" 
                      type="tel"
                      placeholder="+38 (0__) ___ __ __"
                      required={false}
                      value={phoneValue} // Використовуємо value замість defaultValue
                      onChange={(e) => setPhoneValue(formatDisplayPhone(e.target.value))} // Форматуємо миттєво
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:border-primary outline-none transition-all font-bold" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.role_label')}</label>
                <select name="role" defaultValue={editingMember?.role || "staff"} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer transition-all">
                  <option value="staff" className="bg-black">{t('form.roles.staff')}</option>
                  <option value="admin" className="bg-black">{t('form.roles.admin')}</option>
                </select>
              </div>

              {/* НОВИЙ РОЗДІЛ: КЕРУВАННЯ ДОСТУПОМ (тільки при редагуванні) */}
              {editingMember && (
                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1 italic tracking-widest">
                    Security & Access Management
                  </label>
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                    <UserAuthControl 
                      profileId={editingMember.id}
                      email={editingMember.email}
                      lastSyncedEmail={editingMember.last_synced_email}
                      firstName={editingMember.first_name}
                      lastName={editingMember.last_name}
                      role={editingMember.role === 'staff' ? 'instructor' : 'admin'}
                      authUserId={(editingMember as any).auth_user_id} 
                      onStatusChange={(newAuthId) => {
                        setStaff(prev => prev.map(s => 
                          s.id === editingMember.id ? { ...s, auth_user_id: newAuthId } : s
                        ));
                        setEditingMember(prev => prev ? { ...prev, auth_user_id: newAuthId } : null);
                      }}
                    />
                    <p className="mt-4 text-[9px] text-slate-500 leading-relaxed font-medium uppercase tracking-tighter">
                      {editingMember.role === 'admin' 
                        ? "Цей користувач має повний доступ до налаштувань системи." 
                        : "Користувач отримає доступ до розкладу та керування учнями."}
                    </p>
                  </div>
                </div>
              )}

              {/* КНОПКИ ДІЇ */}
              <div className="flex flex-col md:flex-row gap-3 pt-4 pb-safe-bottom-mobile">
                <button type="submit" disabled={isSubmitting} className="order-1 md:order-2 flex-[2] bg-white text-black font-black py-5 rounded-2xl uppercase text-[10px] italic hover:bg-primary transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : t('actions.confirm_deployment')}
                </button>
                <button type="button" onClick={closeModal} className="order-2 md:order-1 flex-1 py-5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                  {t('actions.abort')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}





      {/* MODAL */}
      {/* {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={closeModal} />
          
          <form onSubmit={handleSaveStaff} className="relative w-full max-w-xl bg-[#0D0D0D] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-primary" size={24} />
                <h2 className="text-xl md:text-2xl font-black italic uppercase text-white">
                  {editingMember ? t('form.title_edit') : t('form.title_new')}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="p-2 text-slate-500 bg-white/5 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.first_name')}</label>
                  <input name="firstName" required defaultValue={editingMember?.first_name} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.last_name')}</label>
                  <input name="lastName" required defaultValue={editingMember?.last_name} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary outline-none transition-all" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input name="email" type="email" required defaultValue={editingMember?.email} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:border-primary outline-none transition-all" />
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.phone')}</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input name="phone" required defaultValue={editingMember?.phone} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:border-primary outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 px-1">{t('form.role_label')}</label>
                <select name="role" defaultValue={editingMember?.role || "staff"} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary appearance-none cursor-pointer transition-all">
                  <option value="staff" className="bg-black">{t('form.roles.staff')}</option>
                  <option value="admin" className="bg-black">{t('form.roles.admin')}</option>
                </select>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-4 pb-safe-bottom-mobile">
                <button disabled={isSubmitting} className="order-1 md:order-2 flex-[2] bg-white text-black font-black py-5 rounded-2xl uppercase text-[10px] italic hover:bg-primary transition-all active:scale-95 disabled:opacity-50">
                  {isSubmitting ? "..." : t('actions.confirm_deployment')}
                </button>
                <button type="button" onClick={closeModal} className="order-2 md:order-1 flex-1 py-5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                  {t('actions.abort')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )} */}