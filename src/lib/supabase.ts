import { createBrowserClient } from '@supabase/ssr'

// This client automatically syncs with your Middleware cookies
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)