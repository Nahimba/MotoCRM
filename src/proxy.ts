import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Initialize i18n response
  let response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: any) {
          // SYNC: Update request AND response
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 2. Verified User Check
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role
  
  const pathname = request.nextUrl.pathname
  const segments = pathname.split('/')
  const locale = routing.locales.includes(segments[1] as any) ? segments[1] : routing.defaultLocale;
  const purePathname = '/' + segments.slice(2).join('/')
  const localize = (path: string) => new URL(`/${locale}${path}`, request.url)

  // 3. Protection Logic
  const isPublicRoute = purePathname === '/' || purePathname === '/register' || purePathname.startsWith('/auth')

  if (!user && !isPublicRoute) return NextResponse.redirect(localize('/'))

  if (user && isPublicRoute) {
    const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
    return NextResponse.redirect(localize(dash))
  }

  if (purePathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(localize('/account'))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
}