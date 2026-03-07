// app/set-password/page.tsx
"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) alert("Password updated!");
  };

  return (
    <div>
      <input type="password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={updatePassword}>Set Password</button>
    </div>
  );
}