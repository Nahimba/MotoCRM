// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'
// import createMiddleware from 'next-intl/middleware'
// import { routing } from './i18n/routing'

// const intlMiddleware = createMiddleware(routing);

// /**
//  * FINAL CORRECTED PROXY
//  * Fixes ts(2367) and prevents infinite loading loops.
//  */
// export async function proxy(request: NextRequest) {
//   const { pathname, searchParams } = request.nextUrl;

//   // 1. FAST BYPASS: Skip for static files and internal Next.js requests
//   if (
//     pathname.startsWith('/_next') || 
//     pathname.includes('/api/') || 
//     pathname.includes('/favicon.ico') ||
//     pathname.includes('.')
//   ) {
//     return intlMiddleware(request);
//   }

//   // 2. LOCALE RESPONSE: Initialize next-intl
//   let response = intlMiddleware(request);

//   // 3. SUPABASE CLIENT: Initialize with cookie sync
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll: () => request.cookies.getAll(),
//         setAll: (cookiesToSet) => {
//           cookiesToSet.forEach(({ name, value, options }) => {
//             request.cookies.set({ name, value, ...options });
//             response.cookies.set({ name, value, ...options });
//           });
//         },
//       },
//     }
//   );

//   // 4. AUTH & ROLE: Fetch validated user and role
//   const { data: { user } } = await supabase.auth.getUser();
//   const role = user?.app_metadata?.role?.toLowerCase() || 'rider';

//   // 5. PATH NORMALIZATION
//   const segments = pathname.split('/');
//   const isLocalePresent = routing.locales.includes(segments[1] as any);
//   const locale = isLocalePresent ? segments[1] : routing.defaultLocale;
//   const purePathname = '/' + segments.slice(isLocalePresent ? 2 : 1).join('/');
  
//   const localize = (path: string) => new URL(`/${locale}${path}`, request.url);

//   // 6. BYPASS AUTH ROUTES (Confirm, Recovery, etc)
//   const isAuthRoute = purePathname.startsWith('/auth') || searchParams.has('code');
//   if (isAuthRoute) return response;

//   const isPublicRoute = purePathname === '/' || purePathname === '/register';

//   // 7. SECURITY & REDIRECTS (Loop-Killer Guards)

//   // Redirect Guest to Home
//   if (!user && !isPublicRoute) {
//     return NextResponse.redirect(localize('/'));
//   }

//   // Redirect Logged-in User away from Public pages
//   if (user && isPublicRoute) {
//     const dash = role === 'admin' ? '/admin' : (role === 'instructor' ? '/staff' : '/account');
    
//     // The "as string" cast solves the ts(2367) error by widening the type
//     if ((purePathname as string) !== dash) {
//       return NextResponse.redirect(localize(dash));
//     }
//   }

//   // RBAC: Admin Protection
//   if (purePathname.startsWith('/admin') && role !== 'admin') {
//     if ((purePathname as string) !== '/account') {
//       return NextResponse.redirect(localize('/account'));
//     }
//   }

//   // RBAC: Staff Protection
//   if (purePathname.startsWith('/staff')) {
//     if (role !== 'instructor' && role !== 'admin') {
//       if ((purePathname as string) !== '/account') {
//         return NextResponse.redirect(localize('/account'));
//       }
//     }
//   }

//   return response;
// }

// export const config = {
//   matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
// };




import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, request.url));
  }

  let response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // 1. Отримуємо юзера (валідація JWT на сервері)
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. СУВОРА ПЕРЕВІРКА РОЛІ (Тільки системні дані)
  //let role = user?.app_metadata?.role;
  const role = user?.app_metadata?.role?.toLowerCase() || 'rider';

  // FALLBACK: Якщо в JWT ролі ще немає (кеш), запитуємо БД.
  // Це спрацює лише якщо RLS дозволяє (auth.uid() = auth_user_id)
  // if (user && !role) {
  //   const { data: profile } = await supabase
  //     .from('profiles')
  //     .select('role')
  //     .eq('auth_user_id', user.id)
  //     .single();
    
  //   role = profile?.role;
  // }
  
  const segments = pathname.split('/');
  const isLocalePresent = routing.locales.includes(segments[1] as any);
  const locale = isLocalePresent ? segments[1] : routing.defaultLocale;
  const purePathname = '/' + segments.slice(isLocalePresent ? 2 : 1).join('/');
  const localize = (path: string) => new URL(`/${locale}${path}`, request.url);

  // 3. AUTH BYPASS (Confirm, Password Update, etc.)
  const isAuthRoute = purePathname.startsWith('/auth');
  const hasCode = searchParams.has('code');
  if (isAuthRoute || hasCode) return response;

  const isPublicRoute = purePathname === '/' || purePathname === '/register';

  // 4. ЗАХИСТ ТА РЕДИРЕКТИ
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(localize('/'));
  }

  if (user && isPublicRoute) {
    let dash = '/account'; // Default для rider
    if (role === 'admin') dash = '/admin';
    else if (role === 'instructor') dash = '/staff';
    
    return NextResponse.redirect(localize(dash));
  }

  // 5. СТРОГИЙ RBAC (Role-Based Access Control)
  if (purePathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(localize('/account'));
  }

  if (purePathname.startsWith('/staff')) {
    if (role !== 'instructor' && role !== 'admin') {
      return NextResponse.redirect(localize('/account'));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
};



















// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'
// import createMiddleware from 'next-intl/middleware'
// import { routing } from './i18n/routing'

// const intlMiddleware = createMiddleware(routing);

// // Експортуємо саме 'proxy', як того очікує Turbopack у версії 16+
// export async function proxy(request: NextRequest) {
//   const { pathname, searchParams } = request.nextUrl;

//   // 1. Початковий редирект для кореневого шляху (/)
//   if (pathname === '/') {
//     return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, request.url));
//   }

//   // 2. Ініціалізація відповіді через i18n
//   // Це база, яка містить правильні локалі та заголовки
//   let response = intlMiddleware(request);

//   // 3. Ініціалізація клієнта Supabase
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll: () => request.cookies.getAll(),
//         setAll: (cookiesToSet) => {
//           // Оновлюємо куки в запиті
//           cookiesToSet.forEach(({ name, value, options }) =>
//             request.cookies.set({ name, value, ...options })
//           );
          
//           // Модифікуємо існуючий response, щоб зберегти дані від intlMiddleware
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set({ name, value, ...options })
//           );
//         },
//       },
//     }
//   );

//   // Отримуємо користувача (getUser — найнадійніший метод)
//   const { data: { user } } = await supabase.auth.getUser();
//   const role = user?.user_metadata?.role;
  
//   // Логіка визначення локалі та чистого шляху
//   const segments = pathname.split('/');
//   const isLocalePresent = routing.locales.includes(segments[1] as any);
//   const locale = isLocalePresent ? segments[1] : routing.defaultLocale;
//   const purePathname = '/' + segments.slice(isLocalePresent ? 2 : 1).join('/');

//   const localize = (path: string) => new URL(`/${locale}${path}`, request.url);

//   // --- 4. Логіка Bypass (Абсолютний пріоритет) ---

//   const isAuthConfirm = purePathname.startsWith('/auth/confirm');
//   const isUpdatePassword = purePathname.startsWith('/auth/update-password');
  
//   // Перевіряємо тип потоку або наявність коду підтвердження
//   const hasCode = searchParams.has('code');
//   const authType = searchParams.get('type');
//   const isRecoveryFlow = hasCode || authType === 'recovery' || authType === 'invite' || authType === 'signup';

//   const isPublicRoute = 
//     purePathname === '/' || 
//     purePathname === '/register' || 
//     purePathname.startsWith('/auth');

//   // Якщо це системний процес авторизації — негайно повертаємо response
//   if (isAuthConfirm || isUpdatePassword || isRecoveryFlow) {
//     return response;
//   }

//   // --- 5. Редиректи ---

//   // Захист: Неавторизований на приватних сторінках
//   if (!user && !isPublicRoute) {
//     return NextResponse.redirect(localize('/'));
//   }

//   // Захист: Авторизований на сторінках входу
//   if (user && isPublicRoute) {
//     const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
//     if (!purePathname.startsWith(dash)) {
//       return NextResponse.redirect(localize(dash));
//     }
//   }

//   // Рольовий доступ (RBAC)
//   if (purePathname.startsWith('/admin') && role !== 'admin') {
//     return NextResponse.redirect(localize('/account'));
//   }

//   return response;
// }

// export const config = {
//   matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
// };







// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'
// import createMiddleware from 'next-intl/middleware'
// import { routing } from './i18n/routing'

// const intlMiddleware = createMiddleware(routing);

// export async function proxy(request: NextRequest) {
//   // 1. Початковий редирект для кореневого шляху (/)
//   if (request.nextUrl.pathname === '/') {
//     return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, request.url));
//   }

//   // 2. Ініціалізація відповіді через i18n middleware
//   let response = intlMiddleware(request);

//   // 3. Ініціалізація клієнта Supabase
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll()
//         },
//         setAll(cookiesToSet) {
//           console.log("Middleware: Setting cookies", cookiesToSet.map(c => c.name));
//           // ВИПРАВЛЕНО: Використовуємо об'єктний синтаксис для сумісності з типами Next.js
//           cookiesToSet.forEach(({ name, value, options }) => 
//             request.cookies.set({ name, value, ...options })
//           )
          
//           response = NextResponse.next({ request })
          
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set({ name, value, ...options })
//           )
//         },
//       },
//     }
//   )

//   // Отримуємо користувача
//   const { data: { user } } = await supabase.auth.getUser()
//   const role = user?.user_metadata?.role
  
//   // ВИПРАВЛЕНО: Логіка визначення локалі, щоб уникнути 'undefined'
//   const { pathname, searchParams } = request.nextUrl
//   const segments = pathname.split('/')
  
//   // Перевіряємо, чи перший сегмент є валідною локаллю
//   const isLocalePresent = routing.locales.includes(segments[1] as any);
//   const locale = isLocalePresent ? segments[1] : routing.defaultLocale;
  
//   // Якщо локаль є в URL, purePathname починається з 2-го сегмента, якщо ні — з 1-го
//   const purePathname = isLocalePresent 
//     ? '/' + segments.slice(2).join('/') 
//     : '/' + segments.slice(1).join('/');

//   const localize = (path: string) => new URL(`/${locale}${path}`, request.url)

//   // --- 4. Логіка виключень (Bypass) ---

//   const isAuthConfirm = purePathname.startsWith('/auth/confirm');
//   const isUpdatePassword = purePathname.startsWith('/auth/update-password');
//   const isRecoveryFlow = searchParams.get('type') === 'recovery' || searchParams.get('type') === 'invite';

//   const isPublicRoute = 
//     purePathname === '/' || 
//     purePathname === '/register' || 
//     purePathname.startsWith('/auth') || 
//     isUpdatePassword;

//   // КРИТИЧНО: Bypass для процесів авторизації
//   if (isAuthConfirm || isUpdatePassword || isRecoveryFlow) {
//     return response;
//   }

//   // --- 5. Редиректи ---

//   // Редирект для неавторизованих
//   if (!user && !isPublicRoute) {
//     return NextResponse.redirect(localize('/'))
//   }

//   // Редирект для авторизованих
//   if (user && isPublicRoute && !isRecoveryFlow) {
//     const dash = role === 'admin' ? '/admin' : role === 'instructor' ? '/staff' : '/account';
//     if (!purePathname.startsWith(dash)) {
//       return NextResponse.redirect(localize(dash))
//     }
//   }

//   // Захист адмінки
//   if (purePathname.startsWith('/admin') && role !== 'admin') {
//     return NextResponse.redirect(localize('/account'))
//   }

//   return response
// }

// export const config = {
//   matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)']
// }