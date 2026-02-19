import "@/app/globals.css"
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from "sonner"
import { ThemeScript } from "@/components/theme-script"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'

/** * 1. STATIC PARAMETERS
 * This tells Next.js to pre-render /en and /ru at build time.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** * 2. DYNAMIC METADATA
 * Pulls title and description from your messages/ JSON files.
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: '/favicon.ico',
    },
  };
}

/** * 3. ROOT LAYOUT
 */
export default async function RootLayout({ 
  children,
  params 
}: { 
  children: React.ReactNode,
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering for this locale segment
  setRequestLocale(locale);

  // Load translations for the client provider
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-black text-white font-sans antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Toaster position="top-center" theme="dark" />
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}