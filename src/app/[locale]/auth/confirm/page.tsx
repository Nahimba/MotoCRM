//  /ua/auth/confirm/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bike, Loader2, KeyRound, ChevronRight, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useTranslations } from "next-intl"

export default function ConfirmPage() {
  const t = useTranslations("Auth")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Password Validation Logic
  const validation = {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  }
  const strength = Object.values(validation).filter(Boolean).length
  const isStrongEnough = strength >= 2 // At least 2 of 3 criteria

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrongEnough) {
      toast.error("Пароль занадто слабкий")
      return
    }

    setIsLoading(true)

    try {
      // 1. Update the user's password
      // Supabase handles the session from the URL fragment (#access_token=...) automatically
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        toast.error(updateError.message)
        return
      }

      // 2. Fetch user to determine role for protocol-specific redirect
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error("Помилка ідентифікації")
        router.push("/")
        return
      }

      // Extract role from metadata
      const role = user.user_metadata?.role

      toast.success("Доступ активовано")

      // 3. Dynamic Protocol Redirect based on exact roles
      switch (role) {
        case 'admin':
          router.push('/admin')
          break
        case 'instructor':
          router.push('/staff')
          break
        case 'rider':
          router.push('/account')
          break
        default:
          // Fallback if role is undefined or unknown
          router.push('/account')
          break
      }

      // 4. Force refresh to update session context for the target layout
      router.refresh()

    } catch (err) {
      toast.error("Помилка протоколу")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/10 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-md space-y-8 text-center">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-2xl mb-4 text-primary">
            <Bike size={32} />
          </div>
          <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter">
            MOTO<span className="text-primary">CRM</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
            Активація доступу
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative text-left">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Встановіть пароль</h2>
            <p className="text-xs text-slate-500 mt-1">Створіть надійний ключ для входу в систему</p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-white text-xs font-bold outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
                  placeholder="Введіть новий пароль"
                />
              </div>

              {/* Strength Indicators UI */}
              <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  {isStrongEnough ? 
                    <ShieldCheck className="text-emerald-500" size={14} /> : 
                    <ShieldAlert className="text-primary" size={14} />
                  }
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Статус безпеки: <span className={isStrongEnough ? "text-emerald-500" : "text-primary"}>
                      {isStrongEnough ? "Надійний" : "Слабкий"}
                    </span>
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
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  Завершити активацію <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 transition-colors duration-300 ${met ? "text-emerald-500" : "text-slate-600"}`}>
      <CheckCircle2 size={12} className={met ? "opacity-100" : "opacity-20"} />
      <span>{label}</span>
    </div>
  )
}