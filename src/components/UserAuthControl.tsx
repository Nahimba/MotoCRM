"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ShieldCheck, KeyRound, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface UserAuthControlProps {
  profileId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  authUserId?: string | null;
  lastSyncedEmail?: string | null;
  role: 'rider' | 'instructor' | 'staff' | 'admin';
  onStatusChange?: (newAuthId: string) => void;
}

export default function UserAuthControl({
  profileId,
  email,
  firstName,
  lastName,
  authUserId,
  role,
  lastSyncedEmail,
  onStatusChange
}: UserAuthControlProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // Локальний стейт для миттєвого оновлення UI кнопки
  const [localAuthId, setLocalAuthId] = useState(authUserId);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'activate' | 'reset' | 'sync';
  }>({ show: false, type: 'activate' });

  // Синхронізація локального стейту, якщо пропси зміняться ззовні
  useEffect(() => {
    setLocalAuthId(authUserId);
  }, [authUserId]);

  // const handleExecuteAction = async () => {
  //   if (!profileId || isLoading) return;
    
  //   if (!email && confirmModal.type === 'activate') {
  //     toast.error("Email не вказано. Неможливо активувати доступ.");
  //     return;
  //   }

  //   setIsLoading(true);
  //   const actionType = confirmModal.type;
  //   setConfirmModal(prev => ({ ...prev, show: false }));

  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (!session?.access_token) throw new Error("Сесія вичерпана. Увійдіть знову.");

  //     const endpoint = actionType === 'activate' ? 'activate-user' : 'reset-password';
  //     const payload = actionType === 'activate' 
  //       ? {
  //           profileData: { first_name: firstName, last_name: lastName, email },
  //           role_to_create: role,
  //           existing_profile_id: profileId
  //         }
  //       : { profile_id: profileId };

  //     const { data, error } = await supabase.functions.invoke(endpoint, {
  //       body: payload,
  //       headers: { Authorization: `Bearer ${session.access_token}` }
  //     });

  //     if (error) throw error;

  //     if (actionType === 'activate') {
  //       toast.success("Доступ активовано, інвайт надіслано!");
  //       const newId = data?.id || data?.auth_user_id;
  //       if (newId) {
  //         setLocalAuthId(newId);
  //         if (onStatusChange) onStatusChange(newId);
  //       }
  //     } else {
  //       toast.success("Лист для скидання пароля надіслано!");
  //     }

  //     router.refresh();
  //   } catch (err: any) {
  //     console.error(`Auth Action Error (${actionType}):`, err);
  //     toast.error(err.message || "Сталася помилка.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  const isSynced = email === lastSyncedEmail;
  const isAccountCreated = !!localAuthId;

  const handleExecuteAction = async () => {
    if (!profileId || isLoading) return;
    
    if (!email && confirmModal.type === 'activate') {
      toast.error("Email не вказано. Неможливо активувати доступ.");
      return;
    }

    setIsLoading(true);
    const actionType = confirmModal.type;
    setConfirmModal(prev => ({ ...prev, show: false }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Сесія вичерпана.");

      let endpoint = '';
      if (actionType === 'activate') endpoint = 'activate-user';
      else if (actionType === 'reset') endpoint = 'reset-password';
      else if (actionType === 'sync') endpoint = 'sync-and-reset-user';

      const payload = actionType === 'sync' 
        ? { auth_user_id: localAuthId, profile_id: profileId }
        : actionType === 'activate'
          ? { profileData: { first_name: firstName, last_name: lastName, email }, existing_profile_id: profileId }
          : { profile_id: profileId };

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (actionType === 'sync') {
        toast.success("Email оновлено та посилання надіслано!");
        // We trigger status change to tell the parent to re-fetch the synced_email column
        if (onStatusChange) onStatusChange(localAuthId || ''); 
      } else if (actionType === 'activate') {
        toast.success("Доступ активовано!");
        const newId = data?.id || data?.auth_user_id;
        if (newId) {
          setLocalAuthId(newId);
          if (onStatusChange) onStatusChange(newId);
        }
      } else {
        toast.success("Лист для скидання пароля надіслано!");
      }

      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Сталася помилка.");
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {!isAccountCreated ? (
            <button
              type="button"
              onClick={(e) => {
                  e.preventDefault();
                  setConfirmModal({ show: true, type: 'activate' });
                }}
              disabled={isLoading || !email}
              className="bg-blue-600 text-white py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {!email ? "Вкажіть Email" : "Активувати доступ"}
            </button>
        ) : (
          <>
            {/* Show Reset Password ONLY if emails are already in sync */}
            {isSynced ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmModal({ show: true, type: 'reset' });
                }}
                disabled={isLoading}
                className="bg-zinc-800 text-zinc-400 border border-white/5 py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <KeyRound size={16} />
                <span>Скинути Пароль</span>
              </button>
            ) : (
              /* Show Sync button ONLY if emails are different */
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmModal({ show: true, type: 'sync' });
                }}
                disabled={isLoading}
                className="bg-amber-600/10 text-amber-500 border border-amber-500/20 py-4 px-6 rounded-2xl font-black uppercase text-xs hover:bg-amber-600 hover:text-white transition-all flex items-center gap-2"
              >
                <RotateCcw size={16} />
                <span>Оновити та надіслати Email</span>
              </button>
            )}
          </>
        )}
      </div>

      {confirmModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">
                {confirmModal.type === 'activate' && "Створити акаунт?"}
                {confirmModal.type === 'reset' && "Скинути пароль?"}
                {confirmModal.type === 'sync' && "Оновити доступ?"}
              </h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                {confirmModal.type === 'activate' && "Користувачу буде надіслано лист для активації профілю."}
                {confirmModal.type === 'reset' && "Користувачу буде надіслано посилання для встановлення нового пароля."}
                {confirmModal.type === 'sync' && "Email авторизації буде оновлено відповідно до профілю та надіслано новий доступ."}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleExecuteAction();
                    }}
                    className="w-full bg-primary py-4 rounded-2xl text-black font-black uppercase text-xs hover:scale-[1.02] transition-transform active:scale-95"
                >
                    Підтвердити
                </button>
                
                <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setConfirmModal(prev => ({ ...prev, show: false }));
                    }}
                    className="w-full bg-white/5 py-4 rounded-2xl text-white font-black uppercase text-xs hover:bg-white/10 transition-colors"
                >
                    Скасувати
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}