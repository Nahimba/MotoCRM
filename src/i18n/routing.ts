// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ru'],
  
  // Used when no locale matches
  defaultLocale: 'ru',
  
  // Prefix URLs with the locale (e.g. /en/admin)
  localePrefix: 'always'
});

// Lightweight wrappers around Next.js navigation APIs
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);