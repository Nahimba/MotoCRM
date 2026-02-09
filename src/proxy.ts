import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing);

// Changed function name to 'proxy' for Next.js 16 convention
export async function proxy(request: NextRequest) {
  // 1. Initialize i18n response
  const response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // --- SECURE AUTH CHECK ---
  // Replaced getSession() with getUser() to prevent cookie spoofing
  const { data: { user } } = await supabase.auth.getUser()
  
  // Use user_metadata or fetch from your 'accounts' table if role isn't in metadata
  const role = user?.user_metadata?.role
  
  const pathname = request.nextUrl.pathname
  const segments = pathname.split('/')
  
  // Determine locale and path without locale prefix
  const locale = routing.locales.includes(segments[1] as any) ? segments[1] : routing.defaultLocale;
  const purePathname = '/' + segments.slice(2).join('/')

  const localize = (path: string) => new URL(`/${locale}${path}`, request.url)

  // --- Role Protection Logic ---
  const isPublicRoute = purePathname === '/' || purePathname === '/register' || purePathname.startsWith('/auth')

  // Not logged in -> Redirect to home
  if (!user && !isPublicRoute) return NextResponse.redirect(localize('/'))

  // Logged in on public route -> Redirect to their dashboard
  if (user && isPublicRoute) {
    if (role === 'admin') return NextResponse.redirect(localize('/admin'))
    if (role === 'instructor') return NextResponse.redirect(localize('/staff'))
    return NextResponse.redirect(localize('/account'))
  }

  // Admin route protection
  if (purePathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(localize('/account'))
  }

  return response
}

export const config = {
  // Adjusted matcher for Next.js 16 proxy standards
  matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
}