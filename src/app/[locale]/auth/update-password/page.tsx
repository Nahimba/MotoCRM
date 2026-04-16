
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Bike, Loader2, KeyRound, ShieldCheck, ShieldAlert, CheckCircle2, Mail } from "lucide-react"
import { toast } from "sonner"
import { createBrowserClient } from '@supabase/ssr'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const router = useRouter()

  // const supabase = createBrowserClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // )

  // FIX: Use useMemo or move outside to prevent re-instantiation loop
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  // useEffect(() => {
  //   const checkSession = async () => {
  //     // The route.ts already set the cookies, so getUser() will work immediately
  //     const { data: { user }, error } = await supabase.auth.getUser()
      
  //     if (user) {
  //       setEmail(user.email || "")
  //     } else {
  //       toast.error("Сесія відсутня або посилання застаріло.")
  //       router.push('/')
  //     }
  //     setIsInitializing(false)
  //   }
  //   checkSession()
  // }, [router, supabase.auth])


  // http://localhost:3000/ua/auth/confirm
  // #access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6ImVhMjM4ZjNjLWFlYTctNGMyNi05NWU1LTJjOGNjMzJmODViMyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3d2bmF2anJpY2dud3lzYXdiYmlnLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2MTdjZmVkMC0wN2YyLTRjM2EtOWYyNS01ZTE5OThmYjAxNzYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc0MTc5NzI4LCJpYXQiOjE3NzQxNzYxMjgsImVtYWlsIjoibmFoaW1iYTg4QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6ImRmZ2ZnZmdmZGcgZGZnZmRnZGZnIiwicm9sZSI6InJpZGVyIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzc0MTc2MTI4fV0sInNlc3Npb25faWQiOiIxMmY0ODI2MC1jMjcxLTRkZmQtYTI2Zi00MDJlMTE5ZmZkOTAiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.4BjZvbBuP6YNQIUjnUmasYc6t6A5YzHJvN7IM304Y0Zaai1d6rdKqGF-BNMEXLsKmGmDrOEnimCi8hffdCMAFw
  // &expires_at=1774179728&expires_in=3600&refresh_token=2lvu6zsc3gna&sb=&token_type=bearer&type=recovery


  useEffect(() => {
    let mounted = true;
  
    const checkSession = async () => {
      // Оскільки Route Handler вже встановив куки, сесія має бути тут
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (mounted) {
        if (user) {
          setEmail(user.email || "");
          setIsInitializing(false);
        } else {
          // Останній шанс: можливо сесія тільки-но з'явилася в Auth State
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setEmail(session.user.email || "");
            setIsInitializing(false);
          } else {
            toast.error("Сесія відсутня або посилання застаріло.");
            router.push('/');
          }
        }
      }
    };
  
    checkSession();
    return () => { mounted = false; };
  }, [supabase, router]);



  const validation = {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  }
  const strength = Object.values(validation).filter(Boolean).length
  const isStrongEnough = strength >= 2

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrongEnough) return

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    //const role = user?.user_metadata?.role
    const role = user?.app_metadata?.role

    toast.success("Доступ активовано")
    
    // Localized redirect based on role
    const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
    // router.push(dash)
    // router.refresh()
    // Slightly more robust for SSR
    router.refresh() 
    router.push(dash)
  }

  if (isInitializing) return <div className="min-h-screen bg-black flex items-center justify-center text-primary"><Loader2 className="animate-spin" size={32}/></div>

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-4 text-primary"><Bike size={32} /></div>
          <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter">MOTO<span className="text-primary">CRM</span></h1>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative text-left">
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="email" 
                  value={email} 
                  readOnly 
                  className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 pl-12 text-slate-400 text-xs font-bold cursor-not-allowed outline-none"
                />
              </div>

              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50 transition-all"
                  placeholder="Введіть новий пароль"
                />
              </div>

              <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  {isStrongEnough ? <ShieldCheck className="text-emerald-500" size={14} /> : <ShieldAlert className="text-primary" size={14} />}
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Статус: <span className={isStrongEnough ? "text-emerald-500" : "text-primary"}>{isStrongEnough ? "Надійний" : "Слабкий"}</span>
                  </span>
                </div>
                <div className="space-y-2 text-[10px] font-bold">
                  <Requirement label="Мінімум 8 символів" met={validation.length} />
                  <Requirement label="Містить цифру" met={validation.number} />
                  <Requirement label="Спеціальний символ (!@#)" met={validation.special} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isStrongEnough}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary transition-all disabled:opacity-30"
            >
              {isLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Підтвердити"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${met ? "text-emerald-500" : "text-slate-600"}`}>
      <CheckCircle2 size={12} className={met ? "opacity-100" : "opacity-20"} />
      <span>{label}</span>
    </div>
  )
}




// //  /ua/auth/confirm/page.tsx
// "use client"

// import { useState, useEffect } from "react"
// import { useRouter } from "next/navigation"
// import { Bike, Loader2, KeyRound, ChevronRight, ShieldCheck, ShieldAlert, CheckCircle2, Mail } from "lucide-react"
// import { toast } from "sonner"
// import { supabase } from "@/lib/supabase"

// export default function ConfirmPage() {
//   const [password, setPassword] = useState("")
//   const [email, setEmail] = useState("") // New: For display
//   const [isLoading, setIsLoading] = useState(false)
//   const [isInitializing, setIsInitializing] = useState(true)
//   const router = useRouter()

//   // useEffect(() => {
//   //   const init = async () => {
//   //     const { data: { user } } = await supabase.auth.getUser()
//   //     if (user) {
//   //       setEmail(user.email || "")
//   //     } else {
//   //       toast.error("Сесія відсутня. Спробуйте натиснути посилання в листі знову.")
//   //     }
//   //     setIsInitializing(false)
//   //   }
//   //   init()
//   // }, [])

//   // useEffect(() => {
//   //   const init = async () => {
//   //     // 1. Try to get the session from the URL hash automatically
//   //     const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
//   //     // 2. If no session, the listener below will pick it up once the hash is parsed
//   //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
//   //       if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
//   //         if (session?.user) {
//   //           setEmail(session.user.email || "")
//   //           setIsInitializing(false)
//   //         }
//   //       }
//   //     })

//   //     // If we already have a session (e.g. from cookie), get the user
//   //     const { data: { user } } = await supabase.auth.getUser()
//   //     if (user) {
//   //       setEmail(user.email || "")
//   //       setIsInitializing(false)
//   //     }

//   //     return () => subscription.unsubscribe()
//   //   }
    
//   //   init()
//   // }, [])

//   useEffect(() => {
//     const handleAuth = async () => {
//       // 1. Manually parse the hash
//       const hash = window.location.hash.substring(1);
//       const params = new URLSearchParams(hash);
//       const accessToken = params.get('access_token');
//       const refreshToken = params.get('refresh_token');

//       if (accessToken && refreshToken) {
//         // 2. IMPORTANT: Await the setSession call
//         const { error: sessionError } = await supabase.auth.setSession({
//           access_token: accessToken,
//           refresh_token: refreshToken,
//         });
        
//         if (sessionError) {
//           console.error("Session error:", sessionError);
//           toast.error("Помилка при спробі входу. Спробуйте ще раз.");
//           setIsInitializing(false);
//           return;
//         }
//       }

//       // 3. Verify the user AFTER the session is confirmed
//       const { data: { user }, error: userError } = await supabase.auth.getUser();
      
//       if (user) {
//         setEmail(user.email || "");
//         setIsInitializing(false);
//       } else {
//         toast.error("Сесія недійсна або термін дії вичерпано.");
//         setIsInitializing(false);
//       }
//     };

//     handleAuth();
//   }, []);

//   const validation = {
//     length: password.length >= 8,
//     number: /[0-9]/.test(password),
//     special: /[!@#$%^&*]/.test(password),
//   }
//   const strength = Object.values(validation).filter(Boolean).length
//   const isStrongEnough = strength >= 2

//   const handleSetPassword = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!isStrongEnough) return

//     setIsLoading(true)
//     const { error } = await supabase.auth.updateUser({ password })

//     if (error) {
//       toast.error(error.message)
//       setIsLoading(false)
//       return
//     }

//     const { data: { user } } = await supabase.auth.getUser()
//     const role = user?.user_metadata?.role

//     toast.success("Доступ активовано")
    
//     switch (role) {
//       case 'admin': router.push('/admin'); break;
//       case 'instructor': router.push('/staff'); break;
//       default: router.push('/account'); break;
//     }
//     router.refresh()
//   }

//   if (isInitializing) return <div className="min-h-screen bg-black flex items-center justify-center text-primary"><Loader2 className="animate-spin" size={32}/></div>

//   return (
//     <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
//       <div className="w-full max-w-md space-y-8 text-center">
//         <div className="space-y-2">
//           <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-4 text-primary"><Bike size={32} /></div>
//           <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter">MOTO<span className="text-primary">CRM</span></h1>
//         </div>

//         <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative text-left">
//           <form onSubmit={handleSetPassword} className="space-y-6">
//             <div className="space-y-4">
//               {/* Display Email (Non-editable) */}
//               <div className="relative">
//                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
//                 <input 
//                   type="email" 
//                   value={email} 
//                   readOnly 
//                   className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 pl-12 text-slate-400 text-xs font-bold cursor-not-allowed"
//                 />
//               </div>

//               <div className="relative">
//                 <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
//                 <input
//                   type="password"
//                   required
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50 transition-all"
//                   placeholder="Введіть новий пароль"
//                 />
//               </div>

//               <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-3">
//                 <div className="flex items-center gap-2 mb-1">
//                   {isStrongEnough ? <ShieldCheck className="text-emerald-500" size={14} /> : <ShieldAlert className="text-primary" size={14} />}
//                   <span className="text-[10px] font-black uppercase text-slate-400">
//                     Статус: <span className={isStrongEnough ? "text-emerald-500" : "text-primary"}>{isStrongEnough ? "Надійний" : "Слабкий"}</span>
//                   </span>
//                 </div>
//                 <div className="space-y-2 text-[10px] font-bold">
//                   <Requirement label="Мінімум 8 символів" met={validation.length} />
//                   <Requirement label="Містить цифру" met={validation.number} />
//                   <Requirement label="Спеціальний символ (!@#)" met={validation.special} />
//                 </div>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={isLoading || !isStrongEnough}
//               className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary transition-all disabled:opacity-30"
//             >
//               {isLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Завершити активацію"}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   )
// }

// function Requirement({ label, met }: { label: string; met: boolean }) {
//   return (
//     <div className={`flex items-center gap-2 ${met ? "text-emerald-500" : "text-slate-600"}`}>
//       <CheckCircle2 size={12} className={met ? "opacity-100" : "opacity-20"} />
//       <span>{label}</span>
//     </div>
//   )
// }