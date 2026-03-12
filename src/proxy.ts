import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Handle root redirect to default locale to avoid 404
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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role
  
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const locale = routing.locales.includes(segments[1] as any) ? segments[1] : routing.defaultLocale;
  const purePathname = '/' + segments.slice(2).join('/')
  const localize = (path: string) => new URL(`/${locale}${path}`, request.url)

  // 4. Protection Logic
  const isAuthCallback = purePathname.startsWith('/auth/confirm');
  const isPublicRoute = purePathname === '/' || purePathname === '/register' || purePathname.startsWith('/auth');

  if (isAuthCallback) return response;

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(localize('/'))
  }

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