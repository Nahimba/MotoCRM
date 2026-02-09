// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing'; // Use the shared routing config

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  // Validate that the incoming `locale` is supported
  if (!locale || !routing.locales.includes(locale as any)) {
     return { locale: routing.defaultLocale, messages: (await import(`../../messages/${routing.defaultLocale}.json`)).default };
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});