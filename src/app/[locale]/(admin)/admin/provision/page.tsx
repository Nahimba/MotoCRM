"use client"
import { createClient } from '@supabase/supabase-js'
import { useState } from "react"

// Create a special admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  'YOUR_SERVICE_ROLE_KEY' // <--- PASTE YOUR SECRET KEY HERE
)

export default function ProvisionPage() {
  const [log, setLog] = useState<string[]>([])

  const run = async () => {
    const devUsers = [
      { email: 'admin@motocrm.local', role: 'admin' },
      { email: 'coach@motocrm.local', role: 'instructor' },
      { email: 'rider@motocrm.local', role: 'rider' }
    ]

    for (const u of devUsers) {
      // This official method handles the $2b$ hash, identities, 
      // and provider_id automatically.
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { role: u.role }
      })

      setLog(prev => [...prev, error ? `❌ ${u.email}: ${error.message}` : `✅ ${u.email} created!`])
    }
  }

  return (
    <div className="p-10 bg-black text-white font-mono">
      <button onClick={run} className="p-4 bg-primary text-black font-bold rounded">
        FIX AUTH SYSTEM NOW
      </button>
      <div className="mt-4">{log.map((l, i) => <p key={i}>{l}</p>)}</div>
    </div>
  )
}