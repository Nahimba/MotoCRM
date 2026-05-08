"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  X, Check, Trash2, Calendar as CalendarIcon, 
  MapPin, FileText, Loader2, Contact2, ChevronDown, Clock, User, AlertTriangle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/AuthContext"
import { LessonStatus } from "@/constants/constants"
import { StudentSelectorPlus } from "./StudentSelectorPlus"

import { toZonedTime } from 'date-fns-tz';

// calendar start
import { uk } from "date-fns/locale"
import { format, parseISO, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
// calendar end

// import { format } from "date-fns"
// import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { dateUtils } from '@/lib/date-utils'

interface AddLessonModalProps {
  isOpen: boolean
  onClose: () => void
  instructorId: string | null
  instructors: any[]
  initialDate: Date
  onSuccess: () => void
  onOpenDossier: (client: any) => void
  editLesson: any | null
  workHours: any[]     
  exceptions: any[]
  lessons: any[]
  // existingLessons: any[]
}


export function AddLessonModal({ 
  isOpen, onClose, instructorId, instructors, initialDate, onSuccess, onOpenDossier, editLesson, workHours, exceptions, lessons
}: AddLessonModalProps) {
  const t = useTranslations("Schedule")
  const tStatus = useTranslations("Constants.lesson_statuses")

  //const TZ = 'Europe/Kyiv'
  //const { profile: authProfile } = useAuth()
  const { profile } = useAuth()

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("")
  
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState("")
  
  //const [lessonDate, setLessonDate] = useState(format(toZonedTime(initialDate, TZ), 'yyyy-MM-dd'))
  const [lessonDate, setLessonDate] = useState(dateUtils.getKyivToday());

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
  
  // const clientData = selectedPkg?.accounts?.clients
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedQuickCourseId, setSelectedQuickCourseId] = useState<string | null>(null);
  const [isQuickCreationMode, setIsQuickCreationMode] = useState(false);
  const [quickPrice, setQuickPrice] = useState<number | undefined>(undefined);

  // const quickClientData = useMemo(() => {
  //   if (!isQuickCreationMode || !selectedClientId) return null;
  //   // Find the client info from the packages list using the ID from Quick Mode
  //   const pkgWithClient = packages.find(p => p.accounts?.clients?.id === selectedClientId);
  //   return pkgWithClient?.accounts?.clients;
  // }, [isQuickCreationMode, selectedClientId, packages]);

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





  const TZ = 'Europe/Kyiv';



  // const getStatusWarning = () => {
  //   if (!lessonDate || !selectedHour || !selectedMinute || !duration || !exceptions || !workHours) return null;
  
  //   // 1. Precise Lesson Interval (Kyiv Time)
  //   // Convert minutes to milliseconds: duration * 60000
  //   const lessonStart = parseISO(`${lessonDate}T${selectedHour}:${selectedMinute}:00`);
  //   const lessonEnd = new Date(lessonStart.getTime() + Number(duration) * 3600000);
  
  //   // 2. Check Exceptions
  //   const conflict = exceptions.find(ex => {
  //     const exStart = toZonedTime(new Date(ex.start_at), TZ);
  //     const exEnd = toZonedTime(new Date(ex.end_at), TZ);
  
  //     if (ex.is_all_day) {
  //       /**
  //        * For All-Day: we normalize boundaries to the very start and very end of the days.
  //        * This handles multi-day ranges correctly.
  //        */
  //       const rangeStart = startOfDay(exStart);
  //       const rangeEnd = endOfDay(exEnd);
  
  //       return lessonStart < rangeEnd && lessonEnd > rangeStart;
  //     }
  
  //     // Standard timed overlap
  //     return lessonStart < exEnd && lessonEnd > exStart;
  //   });
  
  //   if (conflict) {
  //     let timeRange = "";
  //     if (!conflict.is_all_day) {
  //       const zStart = toZonedTime(new Date(conflict.start_at), TZ);
  //       const zEnd = toZonedTime(new Date(conflict.end_at), TZ);
  //       timeRange = ` (${format(zStart, "HH:mm")} - ${format(zEnd, "HH:mm")})`;
  //     } else {
  //       timeRange = " (Весь день)";
  //     }
  
  //     return {
  //       message: `${conflict.title}${timeRange}`,
  //       type: 'error'
  //     };
  //   }
  
  //   // 3. Check Work Hours (Day of week)
  //   const dayOfWeek = lessonStart.getDay(); 
  //   const schedule = workHours.find(wh => wh.day_of_week === dayOfWeek && wh.is_active);
  
  //   if (!schedule) {
  //     return { message: "Це неробочий день інструктора", type: 'warning' };
  //   }
  
  //   // 4. Check Work Hours (Time Bounds)
  //   const lessonStartStr = format(lessonStart, "HH:mm");
  //   const lessonEndStr = format(lessonEnd, "HH:mm");
    
  //   const workStartStr = schedule.start_time.slice(0, 5);
  //   const workEndStr = schedule.end_time.slice(0, 5);
  
  //   if (lessonStartStr < workStartStr || lessonEndStr > workEndStr) {
  //     return {
  //       message: `Поза межами робочого часу (${workStartStr} - ${workEndStr})`,
  //       type: 'warning'
  //     };
  //   }
  
  //   return null;
  // };
  
  //const warnings = getStatusWarnings();


  
  // 1. Memoize the warnings so they update as the user types
  const warnings = useMemo(() => {
    // 1. Basic validation
    if (!lessonDate || !selectedHour || !selectedMinute || !duration || !exceptions || !workHours || !lessons) return [];

    const alerts = [];
    const currentLessonId = editLesson?.id; 

    // 2. Precise Lesson Interval
    // Combine form date/time and treat as Kyiv local time
    //const lessonStart = toZonedTime(parseISO(`${lessonDate}T${selectedHour}:${selectedMinute}:00`), TZ);
    const lessonStart = parseISO(`${lessonDate}T${selectedHour}:${selectedMinute}:00`);
    // Using 3600000 because your duration seems to be in hours based on previous code
    const lessonEnd = new Date(lessonStart.getTime() + Number(duration) * 3600000);
 
    // 3. Check Exceptions (Busy slots / All-day)
    exceptions.forEach(ex => {
      const exStart = toZonedTime(new Date(ex.start_at), TZ);
      const exEnd = toZonedTime(new Date(ex.end_at), TZ);

      let isConflict = false;
      if (ex.is_all_day) {
        const rangeStart = startOfDay(exStart);
        const rangeEnd = endOfDay(exEnd);
        isConflict = lessonStart < rangeEnd && lessonEnd > rangeStart;
      } else {
        isConflict = lessonStart < exEnd && lessonEnd > exStart;
      }

      if (isConflict) {
        const timeRange = ex.is_all_day ? " (Весь день)" : ` (${format(exStart, "HH:mm")} - ${format(exEnd, "HH:mm")})`;
        alerts.push({ id: ex.id, message: `${ex.title}${timeRange}`, type: 'error' });
      }
    });

    // // 4. Check Other Lessons
    // lessons.forEach(other => {
    //   if (currentLessonId && other.id === currentLessonId) return;

    //   const otherStart = toZonedTime(new Date(other.start_at), TZ);
    //   const otherEnd = toZonedTime(new Date(other.end_at), TZ);

    //   if (lessonStart < otherEnd && lessonEnd > otherStart) {
    //     alerts.push({
    //       id: other.id,
    //       message: `Перетин з іншим уроком (${format(otherStart, "HH:mm")} - ${format(otherEnd, "HH:mm")})`,
    //       type: 'error'
    //     });
    //   }
    // });
    
    // 4. Check Other Lessons (THE FIX)
    lessons.forEach(other => {
      // Ignore the lesson we are currently editing
      if (currentLessonId && other.id === currentLessonId) return;

      // Convert DB UTC string to Kyiv time object for comparison
      const otherStartObj = toZonedTime(new Date(other.session_date), TZ);
      const otherStart = otherStartObj.getTime();
      
      // Calculate end time using the numeric duration from the DB
      const otherEnd = otherStart + (Number(other.duration) * 3600000);
      
      const myStart = lessonStart.getTime();
      const myEnd = lessonEnd.getTime();

      // Overlap check: My Start < Their End AND My End > Their Start
      if (myStart < otherEnd && myEnd > otherStart) {
        alerts.push({
          id: other.id,
          message: `Перетин з уроком (${format(otherStartObj, "HH:mm")} - ${format(new Date(otherEnd), "HH:mm")})`,
          type: 'error'
        });
      }
    });

    // 5. Check Work Hours
    const dayOfWeek = lessonStart.getDay(); 
    const schedule = workHours.find(wh => wh.day_of_week === dayOfWeek && wh.is_active);

    if (!schedule) {
      alerts.push({ id: 'work-day', message: "Це неробочий день інструктора", type: 'warning' });
    } else {
      const lessonStartStr = format(lessonStart, "HH:mm");
      const lessonEndStr = format(lessonEnd, "HH:mm");
      const workStartStr = schedule.start_time.slice(0, 5);
      const workEndStr = schedule.end_time.slice(0, 5);

      if (lessonStartStr < workStartStr || lessonEndStr > workEndStr) {
        alerts.push({
          id: 'work-hours',
          message: `Поза межами робочого часу (${workStartStr} - ${workEndStr})`,
          type: 'warning'
        });
      }
    }
    
    console.log("Total lessons checked:", lessons.length, "Conflicts found:", alerts.filter(a => a.type === 'error').length);
    return alerts;
  }, [lessonDate, selectedHour, selectedMinute, duration, exceptions, workHours, lessons, editLesson]);





  useEffect(() => {
    if (isOpen) {

      // // 🚩 1. RESET EVERYTHING TO PREVENT STALE UI
      // setPackages([]); // Clear packages so the "Sync edit data" effect waits for fresh data
      // setSelectedPackageId("");
      // setSelectedClientId(null);
      // setIsQuickCreationMode(false);
      // setQuickPrice(undefined);
      // setSummary("");
      // setCustomAddress("");
      // // ... reset any other local states like duration if needed
      
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
            //.eq('status', 'active')
            .or(`status.eq.active${editLesson ? `,id.eq.${editLesson.course_package_id}` : ''}`)
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

        // // Convert the UTC database string specifically to Kyiv time for the form
        // const dateObj = toZonedTime(new Date(editLesson.session_date), TZ)
        // // Now these will always show the "Kyiv Clock" time
        // setLessonDate(format(dateObj, "yyyy-MM-dd"))
        // setSelectedHour(format(dateObj, "HH"))
        // setSelectedMinute(format(dateObj, "mm"))
        const { date, hour, minute } = dateUtils.parseFromDb(editLesson.session_date);
        setLessonDate(date);
        setSelectedHour(hour);
        setSelectedMinute(minute);
        
        // const pkgId = editLesson.course_package_id;
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
  }, [isOpen, editLesson, instructorId])

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

    

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
    
  //   if (!selectedInstructorId) return toast.error("Оберіть інструктора");
    
  //   const isReady = selectedPackageId || (isQuickCreationMode && selectedClientId && selectedQuickCourseId);
  //   if (!isReady) return toast.error(t("selectStudentError"));

  //   setLoading(true);
  
  //   const dateStr = `${lessonDate}T${selectedHour}:${selectedMinute}:00`;
  //   const session_date = formatInTimeZone(dateStr, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  //   const isCustom = locationId === "custom";
  
  //   try {
  //     let error;
  
  //     if (!selectedPackageId && isQuickCreationMode) {
        
  //       // // 1. Find the course object to get the original base_price
  //       // // We assume StudentSelectorPlus might be passing the course data or you fetch it
  //       // // For this example, we calculate it based on the current quickPrice vs course base_price
  //       // const currentCourse = packages.find(p => p.courses?.id === selectedQuickCourseId)?.courses 
  //       // || { base_price: 999999 }; // Fallback
  //       // // 2. Logic: If the price in state is less than the official base_price, it's a discount
  //       // const isDiscounted = quickPrice ? quickPrice < (currentCourse.base_price || 0) : false;

  //       const currentCourse = packages.find(p => p.courses?.id === selectedQuickCourseId)?.courses;
  //       // Compare current price against (Base Price * Duration) to see if it's discounted
  //       const expectedPrice = (currentCourse?.base_price || 0) * parseFloat(duration);
  //       const isDiscounted = quickPrice ? quickPrice < expectedPrice : false;


  //       // 🚀 SILENT TRANSACTIONAL CREATION
  //       const { data, error: rpcError } = await supabase.rpc('fn_quick_lesson_creation', {
  //         p_client_id: selectedClientId,
  //         p_course_id: selectedQuickCourseId, 
  //         p_instructor_id: selectedInstructorId,
  //         p_session_date: session_date,
  //         p_duration: parseFloat(duration),
  //         p_location_id: isCustom ? null : locationId,
  //         p_custom_address: isCustom ? customAddress : null,
  //         p_summary: summary,
  //         p_created_by: profile?.id,
  //         p_status: status,
  //         p_price: quickPrice,
  //         p_is_discounted: isDiscounted
  //       });
  //       error = rpcError;

  //     } else {
  //       // 📝 STANDARD LOGGING / UPDATE
  //       const payload = {
  //         course_package_id: selectedPackageId,
  //         instructor_id: selectedInstructorId,
  //         duration: parseFloat(duration),
  //         session_date,
  //         location_id: isCustom ? null : locationId,
  //         custom_location_address: isCustom ? customAddress : null,
  //         summary,
  //         status,
  //         created_by_profile_id: profile?.id
  //       };


  //       if (editLesson) {
  //         const currentPkg = packages.find(p => p.id === selectedPackageId);
  //         const hasDurationChanged = parseFloat(duration) !== editLesson.duration;
          
  //         // 1. Determine if the price has actually changed from what is in the DB
  //         const priceFromUI = quickPrice !== undefined ? quickPrice : currentPkg?.contract_price;
  //         const hasPriceChanged = currentPkg && priceFromUI !== currentPkg.contract_price;
        
  //         // 2. If Price or Duration changed, we MUST use the RPC to update the Package table too
  //         if (hasPriceChanged || hasDurationChanged) {

  //           const { error: syncError } = await supabase.rpc('fn_sync_lesson_and_package', {
  //             p_lesson_id: editLesson.id,
  //             p_new_duration: parseFloat(duration),
  //             p_new_price: priceFromUI,
  //             p_new_status: status
  //           });
            
  //           // 3. Even after the RPC, we might want to update non-financial fields (summary, address, status)
  //           // The RPC usually only handles duration/price sync.
  //           const { error: lessonError } = await supabase
  //             .from('lessons')
  //             .update({
  //               instructor_id: selectedInstructorId,
  //               session_date,
  //               location_id: isCustom ? null : locationId,
  //               custom_location_address: isCustom ? customAddress : null,
  //               summary,
  //               status
  //             })
  //             .eq('id', editLesson.id);
        
  //           error = syncError || lessonError;
  //         } else {
  //           // 4. No financial changes, just a standard lesson update
  //           const result = await supabase.from('lessons').update(payload).eq('id', editLesson.id);
  //           error = result.error;
  //         }
  //       }

  //     }
  
  //     if (!error) {
  //       toast.success(editLesson ? t("lessonUpdated") : t("lessonLogged"));
  //       onSuccess(); 
  //       onClose();
  //     } else {
  //       toast.error(error.message);
  //     }
  //   } catch (err) {
  //     toast.error("Unexpected error occurred");
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // 1. Basic Validation
    if (!selectedInstructorId) return toast.error("Оберіть інструктора");
    
    const isReady = selectedPackageId || (isQuickCreationMode && selectedClientId && selectedQuickCourseId);
    if (!isReady) return toast.error(t("selectStudentError"));
  
    setLoading(true);
  
    // 2. Prepare Data
    const dateStr = `${lessonDate}T${selectedHour}:${selectedMinute}:00`;
    //const session_date = formatInTimeZone(dateStr, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const session_date = dateUtils.toDbTimestamp(dateStr);
    const isCustom = locationId === "custom";
    const durationNum = parseFloat(duration);
  
    try {
      let error;
  
      if (isQuickCreationMode) {
        /**
         * 🚀 QUICK CREATION MODE
         * We use RPCs here because every change affects both the Lesson and its 1-to-1 Package.
         */
        if (editLesson) {
          // A) Edit Existing Quick Lesson
          const currentPkg = packages.find(p => p.id === selectedPackageId);
          const priceToSync = quickPrice !== undefined ? quickPrice : currentPkg?.contract_price;
  
          const { error: syncError } = await supabase.rpc('fn_sync_lesson_and_package', {
            p_lesson_id: editLesson.id,
            p_new_duration: durationNum,
            p_new_price: priceToSync,
            p_new_status: status,
            p_instructor_id: selectedInstructorId,
            p_session_date: session_date,
            p_location_id: isCustom ? null : locationId,
            p_custom_address: isCustom ? customAddress : null,
            p_summary: summary
          });
  
          // // Update non-financial fields that the RPC might not touch
          // const { error: lessonError } = await supabase
          //   .from('lessons')
          //   .update({
          //     instructor_id: selectedInstructorId,
          //     session_date,
          //     location_id: isCustom ? null : locationId,
          //     custom_location_address: isCustom ? customAddress : null,
          //     summary,
          //     status // Redundant but safe
          //   })
          //   .eq('id', editLesson.id);
          //error = syncError || lessonError;
  
          error = syncError;

        } else {
          // B) Create Brand New Quick Lesson
          const currentCourse = packages.find(p => p.courses?.id === selectedQuickCourseId)?.courses;
          const expectedPrice = (currentCourse?.base_price || 0) * durationNum;
          const isDiscounted = quickPrice ? quickPrice < expectedPrice : false;
  
          const { error: rpcError } = await supabase.rpc('fn_quick_lesson_creation', {
            p_client_id: selectedClientId,
            p_course_id: selectedQuickCourseId,
            p_instructor_id: selectedInstructorId,
            p_session_date: session_date,
            p_duration: durationNum,
            p_location_id: isCustom ? null : locationId,
            p_custom_address: isCustom ? customAddress : null,
            p_summary: summary,
            p_created_by: profile?.id,
            p_status: status,
            p_price: quickPrice,
            p_is_discounted: isDiscounted
          });
          error = rpcError;
        }
      } else {
        /**
         * 📝 STANDARD MODE
         * Lessons belong to multi-lesson packages. We use standard CRUD.
         */
        const payload = {
          course_package_id: selectedPackageId,
          instructor_id: selectedInstructorId,
          duration: durationNum,
          session_date,
          location_id: isCustom ? null : locationId,
          custom_location_address: isCustom ? customAddress : null,
          summary,
          status,
          created_by_profile_id: profile?.id,
          is_counted: status !== 'cancelled'
        };
  
        if (editLesson) {
          const { error: updateError } = await supabase
            .from('lessons')
            .update(payload)
            .eq('id', editLesson.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('lessons')
            .insert([payload]);
          error = insertError;
        }
      }
  
      // 3. Finalize
      if (!error) {
        toast.success(editLesson ? t("lessonUpdated") : t("lessonLogged"));
        onSuccess();
        onClose();
      } else {
        toast.error(error.message);
      }
    } catch (err) {
      console.error("Submit Error:", err);
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
                  status === 'no_show' || status === 'late_cancelled' ? 'text-orange-400' :
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
            {/* <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('date')}</label>
              <div className="relative">
                <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary [color-scheme:dark]" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
                <CalendarIcon size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div> */}

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('date')}
                </label>
                
                {lessonDate && (
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {format(parseISO(lessonDate), "LLLL", { locale: uk }).charAt(0).toUpperCase() + 
                    format(parseISO(lessonDate), "LLLL", { locale: uk }).slice(1)}
                  </span>
                )}
              </div>
              
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-[58px] text-white justify-start font-normal hover:bg-white/10 hover:border-white/20 transition-all outline-none",
                      !lessonDate && "text-slate-500"
                    )}
                  >
                    <CalendarIcon size={16} className="mr-3 text-slate-500" />
                    {lessonDate ? (
                      format(parseISO(lessonDate), "dd.MM.yyyy", { locale: uk })
                    ) : (
                      <span>{t('select_date')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                
                <PopoverContent 
                  className="w-auto p-0 border-white/10 bg-[#09090b] shadow-2xl z-[9999]" 
                  align="start"
                  sideOffset={8}
                >
                  <Calendar
                    mode="single"
                    locale={uk}
                    selected={lessonDate ? parseISO(lessonDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setLessonDate(format(date, "yyyy-MM-dd"))
                      }
                    }}
                    autoFocus
                    // --- User Friendly Options ---
                    showOutsideDays={true} // Shows grayed out days from prev/next month
                    fixedWeeks={true}      // Always shows 6 rows so the modal doesn't jump in height
                    className="rounded-md border border-white/5"
                    
                    // Customizing how "Today" looks
                    modifiers={{
                      today: new Date()
                    }}
                    modifiersClassNames={{
                      today: "border border-primary text-primary font-bold" 
                    }}
                  />
                </PopoverContent>
              </Popover>

              {/* NEW: Warning Logic Display */}
              {/* {warning && (
                <div className={cn(
                  "mt-4 flex items-center gap-3 p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2",
                  warning.type === 'error' 
                    ? "bg-red-500/10 border-red-500/20 text-red-200" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                )}>
                  <AlertTriangle size={16} className={warning.type === 'error' ? "text-red-500" : "text-amber-500"} />
                  <p className="text-[11px] leading-tight font-medium">
                    <strong className="uppercase mr-1">Увага:</strong> {warning.message}
                  </p>
                </div>
              )} */}
              {/* NEW: Warning Logic Display (Stacks multiple alerts) */}
              {/* {warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {warnings.map((alert) => (
                    <div 
                      key={alert.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all animate-in fade-in slide-in-from-top-1",
                        alert.type === 'error' 
                          ? "bg-red-500/10 border-red-500/20 text-red-200" 
                          : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                      )}
                    >
                      <AlertTriangle 
                        size={14} 
                        className={cn("shrink-0", alert.type === 'error' ? "text-red-500" : "text-amber-500")} 
                      />
                      <p className="text-[11px] leading-tight font-medium">
                        <strong className="uppercase mr-1 text-[10px] opacity-70">
                          {alert.type === 'error' ? 'Заборонено' : 'Увага'}:
                        </strong> 
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              )} */}
            </div>

            
            {/* <div className="space-y-2">
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
            </div> */}

            {/* TIME PICKER COLUMN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Час (24H)
                </label>
                {/* Optional: Show "Вибрано" status */}
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {selectedHour}:{selectedMinute}
                </span>
              </div>
              
              <div className="flex gap-2 h-[58px]">
                <div className="relative flex-1">
                  <select 
                    value={selectedHour} 
                    onChange={(e) => setSelectedHour(e.target.value)} 
                    className="w-full h-full bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-primary appearance-none text-center font-black cursor-pointer hover:bg-white/10 transition-all"
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const h = i.toString().padStart(2, '0');
                      return <option key={i} value={h} className="bg-[#09090b]">{h}</option>
                    })}
                  </select>
                  {/* Subtle label inside the select for better UX */}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 pointer-events-none uppercase font-bold">год</span>
                </div>

                <div className="flex items-center text-primary font-black animate-pulse">:</div>

                <div className="relative flex-1">
                  <select 
                    value={selectedMinute} 
                    onChange={(e) => setSelectedMinute(e.target.value)} 
                    className="w-full h-full bg-white/5 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-primary appearance-none text-center font-black cursor-pointer hover:bg-white/10 transition-all"
                  >
                    {["00", "15", "30", "45"].map((m) => (
                      <option key={m} value={m} className="bg-[#09090b]">{m}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 pointer-events-none uppercase font-bold">хв</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Notification Block */}
          {warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {warnings.map((alert) => (
                <div 
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all animate-in fade-in slide-in-from-top-1",
                    alert.type === 'error' 
                      ? "bg-red-500/10 border-red-500/20 text-red-200" 
                      : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                  )}
                >
                  {/* Visual Indicator (The pulsing dot or icon) */}
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0 animate-pulse",
                    alert.type === 'error' ? "bg-red-500" : "bg-amber-500"
                  )} />
                  
                  <p className="text-[11px] leading-tight font-medium">
                    <strong className="uppercase mr-1 text-[10px] opacity-70">
                      {alert.type === 'error' ? 'Заборонено' : 'Увага'}:
                    </strong> 
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          )}


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