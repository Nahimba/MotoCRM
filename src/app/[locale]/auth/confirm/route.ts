// import { createServerClient } from '@supabase/ssr'
// import { type EmailOtpType } from '@supabase/supabase-js'
// import { cookies } from 'next/headers'
// import { NextRequest, NextResponse } from 'next/server'

// export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {

//   console.log("CALLBACK HIT:", request.url);

//   const { searchParams } = new URL(request.url)
//   const token_hash = searchParams.get('token_hash')
//   const type = searchParams.get('type') as EmailOtpType | null
//   const next = searchParams.get('next') ?? '/account'
//   const { locale } = await params


//   console.log("DEBUG: Token Hash exists?", !!token_hash);
//   console.log("DEBUG: Full URL received by server:", request.url);

//   if (!token_hash) {
//     // If there's no token_hash, but there IS a hash in the browser (which we can't see here),
//     // we should redirect to a client-side "bridge" or just the update-password page
//     // where the Supabase Client can parse the # fragment automatically.
    
//     // Use a URL object to ensure the hash (#) from the original request is preserved
//     const target = new URL(`/${locale}/auth/update-password`, request.url)
//     target.searchParams.set('type', 'recovery') // Force the recovery flag for middleware
//     return NextResponse.redirect(target)
//   }


//   // Prepare the redirect URL
//   const redirectTo = request.nextUrl.clone()
//   redirectTo.searchParams.delete('token_hash')
//   redirectTo.searchParams.delete('type')

//   if (token_hash && type) {
//     const cookieStore = await cookies()
    
//     const supabase = createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         cookies: {
//           getAll() {
//             return cookieStore.getAll()
//           },
//           setAll(cookiesToSet) {
//             try {
//               cookiesToSet.forEach(({ name, value, options }) =>
//                 cookieStore.set(name, value, options)
//               )
//             } catch {
//               // Safe to ignore in most server environments
//             }
//           },
//         },
//       }
//     )

//     const { error } = await supabase.auth.verifyOtp({
//       type,
//       token_hash,
//     })

//     if (!error) {
//       if (type === 'recovery') {
//         // Add ?type=recovery so the middleware knows to allow this page
//         redirectTo.pathname = `/${locale}/auth/update-password`
//         redirectTo.searchParams.set('type', 'recovery') 
//       } else {
//         redirectTo.pathname = `/${locale}${next}`
//       }
//       return NextResponse.redirect(redirectTo)
//     }

//     if (error) {
//       // CHECK YOUR VERCEL LOGS FOR THIS:
//       console.error("DEBUG: Auth Verification Failed. Reason:", error.message);
//     }
    
//   }


//   // Redirect to login if something goes wrong
//   return NextResponse.redirect(new URL(`/${locale}/login?error=auth-code-error`, request.url))
// }


import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/auth/update-password'
  
  const { locale } = await params 

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = `/${locale}${next}`
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  // 1. Створюємо порожню відповідь-редирект заздалегідь
  const response = NextResponse.redirect(redirectTo)

  if (token_hash && type) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            console.log("auth/confirm: Setting cookies", cookiesToSet.map(c => c.name));
            // 2. Записуємо куки І в запит, І у відповідь
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set({ name, value, ...options })
              response.cookies.set({ name, value, ...options })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    
    if (!error) {
      // 3. Тепер response містить встановлені куки сесії
      return response
    }
  }

  // Редирект на логін у разі помилки
  return NextResponse.redirect(new URL(`/${locale}/?error=invalid_token`, request.url))
}