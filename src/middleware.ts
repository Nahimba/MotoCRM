import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const role = user?.user_metadata?.role
  const url = request.nextUrl.clone()
  // 1. ALLOW PUBLIC ROUTES
  // Add any other public paths (like /register or /api/public) here
  const isPublicRoute = url.pathname === '/' || url.pathname === '/register' || url.pathname.startsWith('/auth')
  
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. PREVENT LOGGED-IN USERS FROM SEEING LANDING/REGISTER
  if (user && isPublicRoute) {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    if (role === 'instructor') return NextResponse.redirect(new URL('/staff', request.url))
    return NextResponse.redirect(new URL('/account', request.url))
  }

  // 3. ADMIN PRIVILEGE (Covers /admin/provision AND /(admin)/admin)
  if (url.pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/account', request.url))
  }

  // 4. STAFF PRIVILEGE (Admins can also access /staff)
  if (url.pathname.startsWith('/staff') && !['admin', 'instructor'].includes(role)) {
    return NextResponse.redirect(new URL('/account', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public images/assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}