export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  en: 'ltr',
};

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

export const localeShort: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
};

export const LOCALE_COOKIE = 'ICOSNET_LOCALE';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
