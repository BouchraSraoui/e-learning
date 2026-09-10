import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';

export function clientLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : '';
  return isLocale(value) ? value : defaultLocale;
}
