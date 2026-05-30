"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { X, Phone, Share2, Globe, Mail, ChevronDown, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

// import { formatFlexiblePhone, cn} from "@/lib/utils"

import { BaseModal } from "@/components/crm_ui/BaseModal"

interface ClientProfileModalProps {
  client: any // Об'єкт уроку з розкладу
  isOpen: boolean
  onClose: () => void
}

export function ClientProfileModal({ client, isOpen, onClose }: ClientProfileModalProps) {
  const [details, setDetails] = useState<any>(null)
  const [profile, setProfile] = useState<any>(client?.profiles || null)

  const [loading, setLoading] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  

  //const t = useTranslations("Constants")
  const t = useTranslations("Clients.details")
  const tForm = useTranslations("Clients.form")
  const tConst = useTranslations("Constants.gear_type")
  const tConstLS = useTranslations("Constants.lead_sources")
  const tConstSS = useTranslations("Constants.student_stages")

  // Отримуємо ID клієнта та ID конкретного пакета з пропсів
  const targetClientId = client.client_id || client.id
  const targetPackageId = client.course_package_id || client.package_id

  
  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase()

  
  const [isIntelOpen, setIsIntelOpen] = useState(true);

  useEffect(() => {
    async function fetchFullDossier() {
      if (!targetClientId || !isOpen) return // Only fetch when open

      setLoading(true)
      try {
        // 1. Завантажуємо основні дані профілю
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          // .select(`
          //   *,
          //   profiles:profile_id (
          //     first_name,
          //     last_name,
          //     phone,
          //     email,
          //     avatar_url,
          //     address
          //   )
          // `)
          .select(`
            *,
            profiles:profile_id (*)
          `)
          .eq('id', targetClientId)
          .single()

        if (clientError) throw clientError
        
        const rawProfile = Array.isArray(clientData?.profiles) 
          ? clientData?.profiles[0] 
          : clientData?.profiles

        // 2. Завантажуємо дані з в'юхи по конкретному пакету
        // Фільтруємо за client_id ТА package_id для точності
        const { data: dossierData } = await supabase
          .from('client_profile_dossier')
          .select('*')
          .eq('client_id', targetClientId)
          .eq('package_id', targetPackageId)
          .maybeSingle()

        setProfile(rawProfile)
        setDetails({
          ...dossierData,
          is_active_1: clientData?.is_active,
          gear_type: clientData?.gear_type,
          training_stage: clientData?.training_stage,
          lead_source: clientData?.lead_source,
          address: clientData?.address,
          notes: clientData?.notes || dossierData?.client_notes 
        })

        // 3. Обробка Аватара
        const rawAvatar = rawProfile?.avatar_url
        if (rawAvatar) {
          if (rawAvatar.startsWith('http')) {
            setAvatarPreview(rawAvatar)
          } else {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(`avatars/${rawAvatar}`)
            setAvatarPreview(urlData.publicUrl)
          }
        }
      } catch (err) {
        console.error("Помилка завантаження досьє:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchFullDossier()
  }, [targetClientId, targetPackageId, isOpen])

  // const firstName = profile?.first_name || client.client_name || client.name || "Невідомо"
  // const lastName = profile?.last_name || client.client_last_name || client.last_name || ""

  
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



  

  const renderLinks = (text: string) => {
    if (!text) return null;
  
    // Split by whitespace or commas
    const parts = text.split(/[\s,]+/);
  
    return parts.map((part, index) => {
      const isUrl = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(\/\S*)?$/i.test(part);
      
      if (isUrl) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a 
            key={index} 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part} </span>;
    });
  };

  // 1. Отримуємо відрендерені лінки
  const links = profile?.social_link ? renderLinks(profile.social_link) : null;
  
  // 2. Перевіряємо, чи масив лінків не порожній (якщо renderLinks повертає масив елементів)
  const hasLinks = Array.isArray(links) ? links.length > 0 : !!links;


  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      // Pass a higher z-index to ensure it stacks above LessonModal
      className="z-[400]" 
      showCloseButton={false} // We'll use your custom absolute close button
    >
      {/* Absolute Close Button - Overlays the decorative header */}
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 p-2.5 bg-black/40 hover:bg-red-500/20 text-white/50 hover:text-white rounded-full transition-all border border-white/10 z-50 backdrop-blur-md"
      >
        <X size={20} />
      </button>

      <div className="-m-6 md:-m-8 overflow-y-auto custom-scrollbar">
        
        <div className="px-6 md:px-12 pb-2 mt-6 md:mt-18 relative">

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="relative shrink-0">
              <div className="w-36 h-36 md:w-48 md:h-48 bg-gradient-to-br from-zinc-800 to-black rounded-[2rem] md:rounded-[3rem] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="Pilot" />
                ) : (
                  <span className="text-4xl md:text-5xl font-black italic text-zinc-700 tracking-tighter">{initials}</span>
                )}
              </div>
            </div>

            <div className="text-center md:text-left flex-1 w-full min-w-0">
              <div className="flex-1 w-full min-w-0">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2">
                  <span className="text-2xl md:text-3xl font-black italic uppercase text-white tracking-tighter leading-none">{profile?.first_name}</span>
                  <span className="text-2xl md:text-3xl font-black italic uppercase text-primary tracking-tighter leading-none">{profile?.last_name}</span>
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-4 md:mt-6">
  
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${details?.is_active_1 ? 'text-green-500' : 'text-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${details?.is_active_1 ? 'bg-green-500' : 'bg-red-500'}`} />
                  {details?.is_active_1 && details?.training_stage ? tConstSS(details.training_stage) : "Неактивний"}
                </span>

                {details?.gear_type && (
                  <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${tConst(details.gear_type) ? 'text-blue-400' : 'text-orange-400'}`}>
                    {tConst(details.gear_type)}
                  </span>
                )}

              </div>

            </div>

          </div>

          <div className="px-2 md:px-2 pb-0 mt-4 md:mt-4 relative flex justify-center">
            <Link href={`/staff/clients/${targetClientId}/`} className="bg-white text-black py-2.5 px-4 md:py-4 md:px-6 rounded-2xl font-black uppercase text-[12px] md:text-xs hover:bg-primary transition-all items-center whitespace-nowrap">
                  {"До профілю клієнта"}
            </Link>
          </div>

        </div>

        {details?.notes && details.notes !== "" && (
          <div className="px-6 md:px-10 pb-2 mt-2 md:mt-4 relative">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-4 space-y-2 relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest">
                {tForm("notes")}
              </p>
              <span className="mt-6 pt-4 border-t border-zinc-800 block">
                {details.notes}
              </span>
            </div>
          </div>
        )}

        <div className="px-6 md:px-10 pb-8 mt-2 md:mt-4 relative">

          <div className={`bg-[#0a0a0a] border border-white/5 rounded-[1.5rem] md:rounded-[2rem] px-5 py-4 md:p-8 relative overflow-hidden transition-all duration-200 ${isIntelOpen ? 'space-y-5 md:space-y-8 pb-5' : 'space-y-0 pb-4'}`}>
            {/* Header Toggle Wrapper */}
            <div 
              onClick={() => setIsIntelOpen(!isIntelOpen)} 
              className={`flex items-center justify-between cursor-pointer md:cursor-default select-none transition-all duration-200 ${isIntelOpen ? 'border-b border-white/5 pb-4' : 'border-b border-transparent pb-0 md:border-white/5 md:pb-4'}`}
            >
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t("core_intel")}</h2>
              {/* Chevron Indicator - Visible only on mobile */}
              <div className="md:hidden text-slate-300 transition-transform duration-200">
                <ChevronDown size={16} className={isIntelOpen ? "rotate-180" : "rotate-0"} />
              </div>
            </div>

            {/* Collapsible content space */}
            <div className={`${isIntelOpen ? 'block pt-1' : 'hidden'} md:block space-y-5 md:space-y-6`}>

              <div className="flex items-center justify-between gap-3 group/row">
                <div className="flex-1 min-w-0">
                  <InfoRow 
                    icon={<Phone size={14} className="text-slate-500" />} 
                    label={t("phone")} 
                    value={profile?.phone ? formatDisplayPhone(profile.phone) : null} 
                    fallback="Немає номеру" 
                  />
                </div>
                
                {profile?.phone && (
                  <a 
                    href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`} 
                    className="p-3 md:p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary hover:bg-primary hover:text-black transition-all shadow-xl active:scale-95 shrink-0"
                    title="Зателефонувати"
                  >
                    <Phone size={16} strokeWidth={2.5} />
                  </a>
                )}
              </div>
              
              <InfoRow icon={<Mail size={14}/>} label={t("email")} value={profile?.email} fallback="-" />
              <InfoRow icon={<MapPin size={14}/>} label={t("address")} value={details?.address} fallback="-" />

              <InfoRow 
                icon={<Share2 size={14}/>}
                label={tForm("lead_source")} 
                value={details?.lead_source ? tConstLS(String(details.lead_source)) : null}
                fallback="-" 
              />
              <InfoRow 
                    icon={<Globe size={14}/>} 
                    label="Соціальні мережі" 
                    value={hasLinks ? (
                      <div className="flex flex-wrap gap-2 pt-0.5 normal-case">
                        {links}
                      </div>
                    ) : null} 
                    fallback="-" 
                  />
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
    
  )

  function InfoRow({ icon, label, value, fallback }: any) {
    return (
      <div className="flex items-center gap-5 group">
        <div className="p-4 bg-white/5 rounded-2xl text-slate-500 group-hover:text-primary transition-all border border-white/5 group-hover:border-primary/20">
          {icon}
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">
            {label}
          </p>
          {/* CHANGED: p to div to allow block-level content like flex containers */}
          <div className="text-sm font-bold text-white uppercase tracking-tight">
            {value || fallback}
          </div>
        </div>
      </div>
    )
  }
}