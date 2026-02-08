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

  // This refreshes the session if expired - essential for SSR
  const { data: { session } } = await supabase.auth.getSession()
  
  const user = session?.user
  const role = user?.user_metadata?.role
  const url = request.nextUrl.clone()

  // 1. PUBLIC ROUTE DEFINITION
  const isPublicRoute = url.pathname === '/' || 
                        url.pathname === '/register' || 
                        url.pathname.startsWith('/auth')

  // 2. PROTECT PRIVATE ROUTES
  // If no session and trying to access private app areas, kick to Landing
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 3. LOGGED-IN REDIRECTS (Landing/Register protection)
  // Prevents logged-in users from seeing the landing page
  if (user && isPublicRoute) {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    if (role === 'instructor') return NextResponse.redirect(new URL('/staff', request.url))
    return NextResponse.redirect(new URL('/account', request.url))
  }

  // 4. ADMIN-ONLY ZONE
  // Strict protection for /admin routes
  if (url.pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/account', request.url))
  }

  // 5. STAFF ZONE (Admins + Instructors)
  // Allows both 'admin' and 'instructor' roles to access /staff/schedule, etc.
  const isStaffPath = url.pathname.startsWith('/staff')
  const hasStaffAccess = ['admin', 'instructor'].includes(role)

  if (isStaffPath && !hasStaffAccess) {
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
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}