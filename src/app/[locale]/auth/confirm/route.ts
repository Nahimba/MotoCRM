import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/account'
  const { locale } = await params

  // Prepare the redirect URL
  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Safe to ignore in most server environments
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      if (type === 'recovery') {
        // Add ?type=recovery so the middleware knows to allow this page
        redirectTo.pathname = `/${locale}/auth/update-password`
        redirectTo.searchParams.set('type', 'recovery') 
      } else {
        redirectTo.pathname = `/${locale}${next}`
      }
      return NextResponse.redirect(redirectTo)
    }
  }

  // Redirect to login if something goes wrong
  return NextResponse.redirect(new URL(`/${locale}/login?error=auth-code-error`, request.url))
}