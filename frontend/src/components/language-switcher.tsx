'use client';

import { Check, Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Dropdown, MenuItem } from '@/components/ui/menu';
import { setUserLocale } from '@/i18n/locale';
import { type Locale, localeNames, locales, localeShort } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'light' }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(locale: Locale) {
    if (locale === active) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <Dropdown
      align="end"
      trigger={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors',
            variant === 'light'
              ? 'border-white/25 text-white/90 hover:bg-white/10'
              : 'border-line text-slate-600 hover:bg-slate-50',
            pending && 'opacity-60',
          )}
        >
          <Globe size={16} />
          {localeShort[active]}
        </span>
      }
    >
      {locales.map((locale) => (
        <MenuItem key={locale} active={locale === active} onClick={() => select(locale)}>
          <span className="flex-1">{localeNames[locale]}</span>
          {locale === active && <Check size={16} className="text-primary" />}
        </MenuItem>
      ))}
    </Dropdown>
  );
}
