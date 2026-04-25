"use client"

import { useState, useEffect, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { 
  X, Check, Trash2, Calendar as CalendarIcon, 
  MapPin, FileText, Loader2, Contact2, ChevronDown, Clock, User
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"
import { LessonStatus } from "@/constants/constants"
import { StudentSelectorPlus } from "./StudentSelectorPlus"

import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

interface AddLessonModalProps {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null
  instructors: any[]
  initialDate: Date
  onSuccess: () => void
  onOpenDossier: (client: any) => void
  editLesson: any | null
  // existingLessons: any[]
}


export function AddLessonModal({ 
  isOpen, onClose, instructorId, instructors, initialDate, onSuccess, onOpenDossier, editLesson 
}: AddLessonModalProps) {
  const t = useTranslations("Schedule")
  const tStatus = useTranslations("Constants.lesson_statuses")

  const TZ = 'Europe/Kyiv'
  
  //const { profile: authProfile } = useAuth()
  const { profile } = useAuth()

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("")
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState("")
  
  const [lessonDate, setLessonDate] = useState(format(toZonedTime(initialDate, TZ), 'yyyy-MM-dd'))
  const [selectedHour, setSelectedHour] = useState("12")
  const [selectedMinute, setSelectedMinute] = useState("00")
  const [duration, setDuration] = useState("2") 
  
  const [locationId, setLocationId] = useState<string>("custom")
  const [customAddress, setCustomAddress] = useState("")
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<LessonStatus>('planned')

  const selectedPkg = useMemo(() => 
    packages.find(p => p.id === selectedPackageId), 
    [packages, selectedPackageId]
  )
  
  const clientData = selectedPkg?.accounts?.clients

  
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedQuickCourseId, setSelectedQuickCourseId] = useState<string | null>(null);
  const [isQuickCreationMode, setIsQuickCreationMode] = useState(false);
  const [quickPrice, setQuickPrice] = useState<number | undefined>(undefined);

  const quickClientData = useMemo(() => {
    if (!isQuickCreationMode || !selectedClientId) return null;
    // Find the client info from the packages list using the ID from Quick Mode
    const pkgWithClient = packages.find(p => p.accounts?.clients?.id === selectedClientId);
    return pkgWithClient?.accounts?.clients;
  }, [isQuickCreationMode, selectedClientId, packages]);

  // Use either the standard package client or the quick-mode client
  //const displayClient = clientData || quickClientData;
  const displayClient = useMemo(() => {
    if (isQuickCreationMode) {
      // Look through all packages to find the profile info for the selected client
      const pkgWithClient = packages.find(p => p.accounts?.clients?.id === selectedClientId);
      return pkgWithClient?.accounts?.clients;
    }
    return selectedPkg?.accounts?.clients;
  }, [isQuickCreationMode, selectedPkg, packages, selectedClientId]);

  // 2. Add this specific effect to sync edit data once packages are loaded
  useEffect(() => {
    if (editLesson && packages.length > 0) {
      const pkgId = editLesson.course_package_id;
      const currentPackage = packages.find(p => p.id === pkgId);
      
      if (currentPackage) {
        setSelectedPackageId(pkgId);
        setSelectedClientId(currentPackage.accounts?.clients?.id || null);
      }
    }
  }, [editLesson, packages]); // Re-runs as soon as packages array is filled


  useEffect(() => {
    if (isOpen) {

      // 🚩 1. RESET EVERYTHING TO PREVENT STALE UI
      setPackages([]); // Clear packages so the "Sync edit data" effect waits for fresh data
      setSelectedPackageId("");
      setSelectedClientId(null);
      setIsQuickCreationMode(false);
      setQuickPrice(undefined);
      setSummary("");
      setCustomAddress("");
      // ... reset any other local states like duration if needed
      
      const fetchData = async () => {
        try {
          const { data: locData } = await supabase.from('locations').select('*').eq('is_active', true)
          if (locData) setLocations(locData)

          const { data: pkgData, error: pkgError } = await supabase
            .from('course_packages')
            // courses price_type is "package"/"hour"
            .select(`
              id, instructor_id, total_hours, status, contract_price,
              courses:course_id!inner ( name, type, allow_quick_creation, price_type, base_price, discounted_price ),
              accounts:account_id (
                clients:client_id ( 
                  id, notes,
                  profiles:profile_id ( first_name, last_name, avatar_url, email, phone )
                )
              ),
              lessons ( duration, status, is_counted )
            `)
            .eq('status', 'active')
            // // 1. Only include packages where the course allow_quick_creation is FALSE
            // .eq('courses.allow_quick_creation', false) 
            // 2. Sort by creation date (newest first)
            .order('created_at', { ascending: false });
          
          
          if (pkgError) throw pkgError

          if (pkgData) {
            const processed = pkgData.map(pkg => {
              const rawClient = (pkg.accounts as any)?.clients;
              const profileData = Array.isArray(rawClient?.profiles) ? rawClient.profiles[0] : rawClient?.profiles;
              
              return {
                ...pkg,
                accounts: {
                  clients: {
                    ...rawClient,
                    name: profileData?.first_name || 'Unknown',
                    last_name: profileData?.last_name || '',
                    avatar_url: profileData?.avatar_url,
                    email: profileData?.email,
                    phone: profileData?.phone
                  }
                },
                remaining: pkg.total_hours - (
                  pkg.lessons?.filter((l: any) => l.is_counted)
                    .reduce((acc: number, curr: any) => acc + (Number(curr.duration) || 0), 0) || 0
                )
              }
            })
            setPackages(processed)
          }
        } catch (err: any) {
          toast.error("Database error")
        }
      }
      fetchData()

      if (editLesson) {

        // Convert the UTC database string specifically to Kyiv time for the form
        const dateObj = toZonedTime(new Date(editLesson.session_date), TZ)
        // Now these will always show the "Kyiv Clock" time
        setLessonDate(format(dateObj, "yyyy-MM-dd"))
        setSelectedHour(format(dateObj, "HH"))
        setSelectedMinute(format(dateObj, "mm"))
        
        const pkgId = editLesson.course_package_id;
        setSelectedPackageId(editLesson.course_package_id)
        setSelectedInstructorId(editLesson.instructor_id)
        setDuration(editLesson.duration?.toString() || "1")

        // // FIX: Find the client ID associated with this package to "pre-fill" the student selector
        // const currentPackage = packages.find(p => p.id === pkgId);
        // if (currentPackage?.accounts?.clients?.id) {
        //   setSelectedClientId(currentPackage.accounts.clients.id);
        // }
        
        if (editLesson.location_id) {
          setLocationId(editLesson.location_id)
          setCustomAddress("") 
        } else {
          setLocationId("custom")
          setCustomAddress(editLesson.custom_location_address || "")
        }
        
        setSummary(editLesson.summary || "")
        setStatus(editLesson.status || 'planned')
      } else {
        setLocationId("custom")
        setCustomAddress("")
        setSelectedPackageId("")
        setSelectedInstructorId(instructorId || "")

        setIsQuickCreationMode(false)
        setSelectedClientId(null)
        setSelectedQuickCourseId(null)
        setQuickPrice(undefined)
      }
    }
  }, [isOpen, editLesson, editLesson?.id, instructorId])

  const displayAddress = useMemo(() => {
    if (locationId === "custom") return customAddress
    const loc = locations.find(l => l.id === locationId)
    return loc?.address || ""
  }, [locationId, locations, customAddress])

  const filteredLocations = useMemo(() => {
    if (!selectedPkg) return locations
    const courseType = (selectedPkg.courses as any)?.type 
    return locations.filter(loc => loc.type === courseType || loc.type === 'General')
  }, [locations, selectedPkg])




  // Handler for the Quick Mode (Zap button in your component)
  const handleSelectQuickMode = (clientId: string | null, courseId: string, price?: number) => {
    if (!clientId) return;
    setSelectedClientId(clientId);
    setSelectedQuickCourseId(courseId);
    setQuickPrice(price);
    // Only clear package if we are NOT in edit mode
    if (!editLesson) {
      setSelectedPackageId("");
    }
    // setSelectedPackageId(""); // Clear package since we are creating a new one
    setIsQuickCreationMode(true);
  };

  // Handler for changing client (passed as prop)
  const handleSetSelectedClient = (id: string) => {
    setSelectedClientId(id || null);
    // Optional: clear quick mode if switching clients manually
    if (!id) setIsQuickCreationMode(false);
  };


  useEffect(() => {
    if (isQuickCreationMode && selectedQuickCourseId) {
      // Find the course details from your packages list
      const course = packages.find(p => p.courses?.id === selectedQuickCourseId)?.courses;
      
      // If the course is billed hourly, sync price with duration
      if (course?.price_type === 'hour') {
        const basePrice = course.base_price || 0;
        setQuickPrice(basePrice * parseFloat(duration));
      }
    }
  }, [duration, isQuickCreationMode, selectedQuickCourseId, packages]);

    

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInstructorId) return toast.error("Оберіть інструктора");
    
    const isReady = selectedPackageId || (isQuickCreationMode && selectedClientId && selectedQuickCourseId);
    if (!isReady) return toast.error(t("selectStudentError"));

    setLoading(true);
  
    const dateStr = `${lessonDate}T${selectedHour}:${selectedMinute}:00`;
    const session_date = formatInTimeZone(dateStr, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const isCustom = locationId === "custom";
  
    try {
      let error;
  
      if (!selectedPackageId && isQuickCreationMode) {
        
        // // 1. Find the course object to get the original base_price
        // // We assume StudentSelectorPlus might be passing the course data or you fetch it
        // // For this example, we calculate it based on the current quickPrice vs course base_price
        // const currentCourse = packages.find(p => p.courses?.id === selectedQuickCourseId)?.courses 
        // || { base_price: 999999 }; // Fallback
        // // 2. Logic: If the price in state is less than the official base_price, it's a discount
        // const isDiscounted = quickPrice ? quickPrice < (currentCourse.base_price || 0) : false;

        const currentCourse = packages.find(p => p.courses?.id === selectedQuickCourseId)?.courses;
        // Compare current price against (Base Price * Duration) to see if it's discounted
        const expectedPrice = (currentCourse?.base_price || 0) * parseFloat(duration);
        const isDiscounted = quickPrice ? quickPrice < expectedPrice : false;


        // 🚀 SILENT TRANSACTIONAL CREATION
        const { data, error: rpcError } = await supabase.rpc('fn_quick_lesson_creation', {
          p_client_id: selectedClientId,
          p_course_id: selectedQuickCourseId, 
          p_instructor_id: selectedInstructorId,
          p_session_date: session_date,
          p_duration: parseFloat(duration),
          p_location_id: isCustom ? null : locationId,
          p_custom_address: isCustom ? customAddress : null,
          p_summary: summary,
          p_created_by: profile?.id,
          p_status: status,
          p_price: quickPrice,
          p_is_discounted: isDiscounted
        });
        error = rpcError;
      } else {
        // 📝 STANDARD LOGGING / UPDATE
        const payload = {
          course_package_id: selectedPackageId,
          instructor_id: selectedInstructorId,
          duration: parseFloat(duration),
          session_date,
          location_id: isCustom ? null : locationId,
          custom_location_address: isCustom ? customAddress : null,
          summary,
          status,
          created_by_profile_id: profile?.id
        };


        // if (editLesson) {
          
        //   const currentPkg = packages.find(p => p.id === selectedPackageId);
        //   const hasDurationChanged = parseFloat(duration) !== editLesson.duration;
          
        //   // Use the price from StudentSelectorPlus (quickPrice) if available, 
        //   // otherwise fallback to the current package price
        //   const priceToSync = quickPrice !== undefined ? quickPrice : currentPkg?.contract_price;
        
        //   // We use the RPC if it's a "Quick Created" package OR if the duration changed
        //   if (currentPkg?.courses?.allow_quick_creation || hasDurationChanged) {
        //     const { error: syncError } = await supabase.rpc('fn_sync_lesson_and_package', {
        //       p_lesson_id: editLesson.id,
        //       p_new_duration: parseFloat(duration),
        //       p_new_price: priceToSync
        //     });
        //     error = syncError;
        //   } else {
        //     // Standard update for regular lessons
        //     const result = await supabase.from('lessons').update(payload).eq('id', editLesson.id);
        //     error = result.error;
        //   }
        // } else {
        //   const result = await supabase.from('lessons').insert([payload]);
        //   error = result.error;
        // }

        if (editLesson) {
          const currentPkg = packages.find(p => p.id === selectedPackageId);
          const hasDurationChanged = parseFloat(duration) !== editLesson.duration;
          
          // 1. Determine if the price has actually changed from what is in the DB
          const priceFromUI = quickPrice !== undefined ? quickPrice : currentPkg?.contract_price;
          const hasPriceChanged = currentPkg && priceFromUI !== currentPkg.contract_price;
        
          // 2. If Price or Duration changed, we MUST use the RPC to update the Package table too
          if (hasPriceChanged || hasDurationChanged) {
            const { error: syncError } = await supabase.rpc('fn_sync_lesson_and_package', {
              p_lesson_id: editLesson.id,
              p_new_duration: parseFloat(duration),
              p_new_price: priceFromUI
            });
            
            // 3. Even after the RPC, we might want to update non-financial fields (summary, address, status)
            // The RPC usually only handles duration/price sync.
            const { error: lessonError } = await supabase
              .from('lessons')
              .update({
                instructor_id: selectedInstructorId,
                session_date,
                location_id: isCustom ? null : locationId,
                custom_location_address: isCustom ? customAddress : null,
                summary,
                status
              })
              .eq('id', editLesson.id);
        
            error = syncError || lessonError;
          } else {
            // 4. No financial changes, just a standard lesson update
            const result = await supabase.from('lessons').update(payload).eq('id', editLesson.id);
            error = result.error;
          }
        }


      }
      //     const result = editLesson 
      //     ? await supabase.from('lessons').update(payload).eq('id', editLesson.id)
      //     : await supabase.from('lessons').insert([payload]);
      //   error = result.error;
      // }
  
      if (!error) {
        toast.success(editLesson ? t("lessonUpdated") : t("lessonLogged"));
        onSuccess(); 
        onClose();
      } else {
        toast.error(error.message);
      }
    } catch (err) {
      toast.error("Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return
    setLoading(true)
    const { error } = await supabase.from('lessons').delete().eq('id', editLesson.id)
    if (!error) { toast.success(t("deleted")); onSuccess(); onClose() }
    setLoading(false)
  }

  if (!isOpen) return null

  const allStatuses: LessonStatus[] = ['planned', 'completed', 'cancelled', 'rescheduled', 'no_show', 'late_cancelled'];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-[#0A0A0A] border-t md:border border-white/10 w-full max-w-lg rounded-t-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 md:hidden" />

        <div className="px-6 py-4 md:px-8 md:py-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
               <CalendarIcon size={20} />
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-white leading-none">
              {editLesson ? t('editLesson') : t('scheduleLesson')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-white rounded-full transition-all border border-white/10">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          

          {/* Вибір Інструктора*/}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Інструктор
            </label>
            <div className="relative">
              <select 
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl p-4 text-[13px] font-black text-white outline-none focus:border-primary transition-all cursor-pointer"
              >
                {instructors.map((ins) => (
                  <option key={ins.id} value={ins.id} className="bg-[#121212]">
                    {ins.profiles?.first_name} {ins.profiles?.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>


          <StudentSelectorPlus 
            isOpen={isOpen}
            packages={packages}
            selectedPackageId={selectedPackageId}
            selectedClientId={selectedClientId}
            setSelectedClientId={handleSetSelectedClient}
            setSelectedPackageId={(id) => {
              setSelectedPackageId(id);
              setIsQuickCreationMode(false); // Disable quick mode if a standard package is picked
            }}
            onSelectQuickMode={handleSelectQuickMode}
            currentInstructorId={selectedInstructorId} // Use the instructor currently selected in the modal
            duration = {duration}
            isEditMode = {!!editLesson}
          />



          {displayClient && (
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-primary/30 overflow-hidden bg-black shrink-0">
                    {displayClient.avatar_url ? (
                      <img 
                        src={displayClient.avatar_url.startsWith('http') 
                          ? displayClient.avatar_url 
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/avatars/${displayClient.avatar_url}`} 
                        className="w-full h-full object-cover" 
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/40"><User size={20} /></div>
                    )}
                  </div>
                  <div className="leading-tight">
                    <h3 className="text-sm font-black text-white uppercase italic">
                      {displayClient.name} {displayClient.last_name}
                    </h3>
                    
                    {/* Only show hours if we have a selected package, not in quick mode */}
                    {!isQuickCreationMode && selectedPkg && (
                      <div className="flex items-center gap-1 text-[10px] text-primary font-black tabular-nums uppercase">
                        <Clock size={10} /> {selectedPkg.remaining}h {t('hoursLeft')}
                      </div>
                    )}
                    
                    {/* {isQuickCreationMode && (
                      <div className="text-[10px] text-amber-500 font-black uppercase italic">
                        Разове
                      </div>
                    )} */}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDossier(displayClient)} 
                  className="p-3 bg-primary text-black rounded-xl hover:bg-white transition-all shadow-lg active:scale-90"
                >
                  <Contact2 size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as LessonStatus)}
                className={`w-full appearance-none bg-white/5 border border-white/10 rounded-2xl p-4 text-[13px] font-black tracking-wider outline-none focus:border-primary transition-all cursor-pointer ${
                  status === 'planned' ? 'text-blue-400' : 
                  status === 'completed' ? 'text-green-400' :
                  status === 'cancelled' || status === 'rescheduled' ? 'text-slate-500' : 
                  'text-red-500'
                }`}
              >
                {allStatuses.map((s) => (
                  <option key={s} value={s} className="bg-[#121212] text-white">
                    {tStatus(s)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('date')}</label>
              <div className="relative">
                <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary [color-scheme:dark]" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
                <CalendarIcon size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('time')} (24H)</label>
              <div className="flex gap-2">
                <select value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary appearance-none text-center font-black">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')} className="bg-black">{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="flex items-center text-primary font-black">:</div>
                <select value={selectedMinute} onChange={(e) => setSelectedMinute(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary appearance-none text-center font-black">
                  {["00", "15", "30", "45"].map((m) => (
                    <option key={m} value={m} className="bg-black">{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('duration')}</label>
            <div className="grid grid-cols-4 gap-2">
              {["1", "2", "3", "4"].map((val) => (
                <button key={val} type="button" onClick={() => setDuration(val)} className={`py-3 rounded-xl font-black text-xs border transition-all ${duration === val ? 'bg-primary text-black border-primary shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {val}h
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('location')}</label>
              <div className="relative">
                <select 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary appearance-none pr-12" 
                    value={locationId} 
                    onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="custom" className="bg-black text-primary font-black italic">✦ Адреса</option>
                  {filteredLocations.map(loc => (
                    <option key={loc.id} value={loc.id} className="bg-black">{loc.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40">
                    <MapPin size={18} />
                </div>
                <input 
                    type="text"
                    placeholder="Адреса..."
                    readOnly={locationId !== "custom"}
                    value={displayAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className={`w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-4 text-sm transition-all outline-none ${
                        locationId === "custom" 
                        ? "border-primary/30 text-white focus:border-primary" 
                        : "border-white/5 text-slate-500 opacity-60 grayscale cursor-not-allowed"
                    }`}
                />
            </div>
          </div>

          <div className="relative">
            <textarea placeholder={t('notesPlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary min-h-[80px] resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <FileText size={16} className="absolute right-5 top-4 text-slate-500" />
          </div>

          <div className="flex gap-3 pt-2 pb-safe-bottom-mobile">
            {editLesson && (profile?.role === 'admin') && (
              <button type="button" onClick={handleDelete} className="p-5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={22} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 py-5 bg-primary text-black font-black uppercase rounded-2xl hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={4} />}
              {editLesson ? t('update') : t('confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



  /**
   * Handles the selection from StudentSelector.
   * If pkgId is provided, it's a standard lesson for an existing package.
   * If pkgId is empty but clientId/courseId exist, it triggers Quick Creation Mode.
   */
  // const handleStudentSelect = (
  //   pkgId: string, 
  //   clientId?: string, 
  //   courseId?: string
  // ) => {
  //   if (pkgId) {
  //     // STANDARD MODE
  //     setSelectedPackageId(pkgId);
  //     setIsQuickCreationMode(false);
  //     setSelectedClientId(null);
  //     setSelectedQuickCourseId(null);
  //   } else if (clientId && courseId) {
  //     // QUICK CREATION MODE
  //     setSelectedPackageId("");
  //     setIsQuickCreationMode(true);
  //     setSelectedClientId(clientId);
  //     setSelectedQuickCourseId(courseId);
  //   }
  // };


  // // Get a unique list of students from the packages
  // const uniqueStudents = useMemo(() => {
  //   const map = new Map();
  //   packages.forEach(p => {
  //     const client = p.accounts?.clients;
  //     if (client && !map.has(client.id)) map.set(client.id, client);
  //   });
  //   return Array.from(map.values());
  // }, [packages]);

  // // Handle the logic when the second dropdown changes
  // const handlePackageChange = (val: string) => {
  //   if (val.startsWith("quick_")) {
  //     const courseId = val.replace("quick_", "");
  //     setIsQuickCreationMode(true);
  //     setSelectedPackageId("");
  //     setSelectedQuickCourseId(courseId);
  //   } else {
  //     setIsQuickCreationMode(false);
  //     setSelectedPackageId(val);
  //     setSelectedQuickCourseId(null);
  //   }
  // };






          {/* STATUS SELECTOR - Expanded to 2 rows grid for 6 statuses */}
          {/* <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('status')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {allStatuses.map((s) => (
                <button 
                  key={s} 
                  type="button" 
                  onClick={() => setStatus(s)} 
                  className={`py-3 rounded-xl font-black text-[9px] uppercase border transition-all leading-tight ${
                    status === s 
                      ? 'bg-white text-black border-white shadow-xl' 
                      : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div> */}