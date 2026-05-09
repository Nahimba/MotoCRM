import "@/app/globals.css"
import { AuthProvider } from '@/context/AuthContext'
import { NotificationProviderWrapper } from '@/context/NotificationContext'
import { Toaster } from "sonner"
import { ThemeScript } from "@/components/theme-script"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { Metadata, Viewport } from 'next'

/**
 * 1. STATIC PARAMETERS
 * Оптимізує збірку, вказуючи Next.js доступні мовні версії.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 2. VIEWPORT CONFIGURATION
 * Критично для CRM: прибирає "стрибки" екрана та автоматичний зум на iPhone.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

/**
 * 3. DYNAMIC METADATA
 * Повна підтримка брендингу RaceWay та PWA (Progressive Web App).
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: {
      default: t('title'),
      template: `%s | ${t('siteName')}`,
    },
    description: t('description'),
    keywords: t('keywords'),
    
    // Посилання на іконки (мають бути у папці /public)
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }, // Додано для Splash Screen
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },

    // Налаштування для того, щоб сайт виглядав як додаток на iPhone
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: t('siteName'),
    },

    // SEO та індексація
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },

    // OpenGraph для гарного вигляду посилань у Telegram/Viber
    openGraph: {
      title: t('title'),      
      description: t('description'),
      url: './',
      siteName: t('siteName'),
      locale: locale,
      type: 'website',
    },

    // Посилання на маніфест (для Android та Windows)
    manifest: '/site.webmanifest',
  };
}

/**
 * 4. ROOT LAYOUT
 */
export default async function RootLayout({ 
  children,
  params 
}: { 
  children: React.ReactNode,
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  // Валідація локалі
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Налаштування статичної генерації для поточної мови
  setRequestLocale(locale);

  // Отримання перекладів для клієнтської частини
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-black text-white font-sans antialiased selection:bg-red-600 selection:text-white">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Toaster 
            position="top-center" 
            theme="dark" 
            richColors 
            closeButton
          />
          <AuthProvider>
            <NotificationProviderWrapper>
              {/* Основний контейнер для структури сторінки */}
              <div className="relative flex min-h-screen flex-col">
                {children}
              </div>
            </NotificationProviderWrapper>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}


// import "@/app/globals.css"
// import { AuthProvider } from '@/context/AuthContext'
// import { NotificationProviderWrapper } from '@/context/NotificationContext'
// import { Toaster } from "sonner"
// import { ThemeScript } from "@/components/theme-script"
// import { NextIntlClientProvider } from 'next-intl'
// import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
// import { routing } from '@/i18n/routing'
// import { notFound } from 'next/navigation'

// /** * 1. STATIC PARAMETERS
//  * This tells Next.js to pre-render /en and /ru at build time.
//  */
// export function generateStaticParams() {
//   return routing.locales.map((locale) => ({ locale }));
// }

// /** * 2. DYNAMIC METADATA
//  * Pulls title and description from your messages/ JSON files.
//  */
// export async function generateMetadata({ 
//   params 
// }: { 
//   params: Promise<{ locale: string }> 
// }) {
//   const { locale } = await params;
//   const t = await getTranslations({ locale, namespace: 'Metadata' });

//   return {
//     title: t('title'),
//     description: t('description'),
//     icons: {
//       icon: '/favicon.ico',
//     },
//   };
// }

// /** * 3. ROOT LAYOUT
//  */
// export default async function RootLayout({ 
//   children,
//   params 
// }: { 
//   children: React.ReactNode,
//   params: Promise<{ locale: string }>
// }) {
//   const { locale } = await params;

//   // Validate that the incoming `locale` is valid
//   if (!routing.locales.includes(locale as any)) {
//     notFound();
//   }

//   // Enable static rendering for this locale segment
//   setRequestLocale(locale);

//   // Load translations for the client provider
//   const messages = await getMessages();

//   return (
//     <html lang={locale} className="dark" suppressHydrationWarning>
//       <head>
//         <ThemeScript />
//       </head>
//       <body className="bg-black text-white font-sans antialiased">
//         <NextIntlClientProvider messages={messages} locale={locale}>
//           <Toaster position="top-center" theme="dark" />
//           <AuthProvider>
//             {/* {children} */}
//             <NotificationProviderWrapper>
//               {children}
//             </NotificationProviderWrapper>
//           </AuthProvider>
//         </NextIntlClientProvider>
//       </body>
//     </html>
//   )
// }