import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Handle Localization first
  let response = intlMiddleware(request);

  // 2. Setup Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = intlMiddleware(request);
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const segments = pathname.split('/');
  const purePathname = '/' + segments.slice(2).join('/');
  const locale = routing.locales.includes(segments[1] as any) ? segments[1] : routing.defaultLocale;
  const localize = (path: string) => new URL(`/${locale}${path}`, request.url);

  // 3. THE FIX: Define PUBLIC routes correctly
  // Added '/auth' to isPublic so the middleware doesn't kick out users clicking email links
  const isPublic = purePathname === '/' || purePathname === '/register' || purePathname.startsWith('/auth');

  // 4. Protection Logic
  if (!user && !isPublic) {
    return NextResponse.redirect(localize('/'));
  }

  // 5. Redirection for logged-in users (don't redirect if they are on /auth/update-password)
  if (user && (purePathname === '/' || purePathname === '/register')) {
    const role = user?.user_metadata?.role;
    const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
    return NextResponse.redirect(localize(dash));
  }

  return response;
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