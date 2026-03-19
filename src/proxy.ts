import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Root redirect: Force locale to default to prevent 404s
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, request.url));
  }

  // 2. Initialize response with intlMiddleware
  let response = intlMiddleware(request);

  // 3. Initialize Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role
  
  const { pathname, searchParams } = request.nextUrl
  const segments = pathname.split('/')
  const locale = routing.locales.includes(segments[1] as any) ? segments[1] : routing.defaultLocale;
  const purePathname = '/' + segments.slice(2).join('/')
  const localize = (path: string) => new URL(`/${locale}${path}`, request.url)

  const isAuthCallback = purePathname.startsWith('/auth/confirm');
  const isUpdatePassword = purePathname.startsWith('/auth/update-password');
  const isPublicRoute = purePathname === '/' || purePathname === '/register' || purePathname.startsWith('/auth');

  // --- NEW PROTECTION LOGIC ---

  // 1. If user is trying to update password, let them through NO MATTER WHAT.
  // The client component will handle the session from the URL #hash.
  if (isUpdatePassword || isAuthCallback) {
    return response;
  }

  // 2. If not logged in and trying to access a private route, send to home
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(localize('/'))
  }

  // 3. If logged in but on a public page, send to dashboard (unless it's auth related)
  if (user && isPublicRoute && !isUpdatePassword) {
    const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
    return NextResponse.redirect(localize(dash))
  }

  // 4. Admin protection
  if (purePathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(localize('/account'))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
}

// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'
// import createMiddleware from 'next-intl/middleware'
// import { routing } from './i18n/routing'

// const intlMiddleware = createMiddleware(routing);

// export async function proxy(request: NextRequest) {
//   // 1. Initialize i18n response
//   let response = intlMiddleware(request)

//   // 2. Initialize Supabase client with the latest cookie methods
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll()
//         },
//         setAll(cookiesToSet) {
//           // Sync cookies to the request so downstream components can read them
//           cookiesToSet.forEach(({ name, value, options }) =>
//             request.cookies.set(name, value)
//           )
          
//           // Generate a new response to propagate the cookies
//           response = NextResponse.next({ request })
          
//           // Sync cookies to the actual HTTP response
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set(name, value, options)
//           )
//         },
//       },
//     }
//   )

//   // 2. Verified User Check
//   const { data: { user } } = await supabase.auth.getUser()
//   const role = user?.user_metadata?.role
  
//   const pathname = request.nextUrl.pathname
//   const segments = pathname.split('/')
//   const locale = routing.locales.includes(segments[1] as any) ? segments[1] : routing.defaultLocale;
//   const purePathname = '/' + segments.slice(2).join('/')
//   const localize = (path: string) => new URL(`/${locale}${path}`, request.url)

//   // 3. Protection Logic
//   const isPublicRoute = purePathname === '/' || purePathname === '/register' || purePathname.startsWith('/auth')

//   if (!user && !isPublicRoute) return NextResponse.redirect(localize('/'))

//   if (user && isPublicRoute) {
//     const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
//     return NextResponse.redirect(localize(dash))
//   }

//   if (purePathname.startsWith('/admin') && role !== 'admin') {
//     return NextResponse.redirect(localize('/account'))
//   }

//   return response
// }

// export const config = {
//   matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
// }