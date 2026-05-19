"use client"
import { createClient } from '@supabase/supabase-js'
import { useState } from "react"

// Используем переменную окружения (которая в .env заменена на фейк)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake-project-sandbox.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake_service_role_key_for_sandbox_safety'
)

export default function ProvisionPage() {
  const [log, setLog] = useState<string[]>([])

  const run = async () => {
    const devUsers = [
      { email: 'admin@motocrm.local', role: 'admin' },
      { email: 'coach@motocrm.local', role: 'instructor' },
      { email: 'rider@motocrm.local', role: 'rider' }
    ]

    // Код закомментирован, база в полной безопасности
    /*
    for (const u of devUsers) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: 'passwordNO',
        email_confirm: true,
        user_metadata: { role: u.role }
      })
      setLog(prev => [...prev, error ? `❌ ${u.email}: ${error.message}` : `✅ ${u.email} created!`])
    }
    */
  }

  return (
    <div className="p-10 bg-black text-white font-mono">
      <button onClick={run} className="p-4 bg-primary text-black font-bold rounded">
        FIX AUTH SYSTEM NOW (SANDBOX MODE)
      </button>
      <div className="mt-4">{log.map((l, i) => <p key={i}>{l}</p>)}</div>
    </div>
  )
}