import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Plus_Jakarta_Sans, Public_Sans } from 'next/font/google';
import { type Locale, localeDirection } from '@/i18n/config';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Icosnet Learning',
    template: '%s · Icosnet Learning',
  },
  description: 'Internal training library for Icosnet — learn, get certified, grow.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = localeDirection[locale];

  return (
    <html
      lang={locale}
      dir={dir}
      className={cn(jakarta.variable, publicSans.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-surface text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
