'use client';

import { ShieldCheck, ShieldX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/states';
import { Logo } from '@/components/ui/logo';
import { useVerify } from '@/hooks/use-certificates';
import { cn } from '@/lib/utils';

export default function VerifyPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? '';
  const t = useTranslations('verify');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { data, isPending } = useVerify(code);

  const valid = Boolean(data?.valid);
  const issued = data?.issuedAt
    ? new Date(data.issuedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="overflow-hidden">
          {isPending ? (
            <LoadingState label={tc('loading')} />
          ) : (
            <>
              <div className={cn('p-6 text-center text-white', valid ? 'bg-emerald-600' : 'bg-rose-600')}>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                  {valid ? <ShieldCheck size={30} /> : <ShieldX size={30} />}
                </span>
                <h1 className="mt-3 text-xl font-extrabold">
                  {valid ? t('validTitle') : t('invalidTitle')}
                </h1>
                <p className="mt-1 text-sm text-white/85">
                  {valid ? t('validSubtitle') : t('invalidSubtitle')}
                </p>
              </div>

              <CardBody className="space-y-4">
                {valid && data ? (
                  <dl className="space-y-3">
                    <Row label={t('holder')} value={data.holderName ?? '—'} />
                    <Row label={t('course')} value={data.courseTitle ?? '—'} />
                    {issued && <Row label={t('issued')} value={issued} />}
                    <Row label={t('code')} value={data.code} mono />
                  </dl>
                ) : (
                  <p className="text-center text-sm text-muted">{t('unknownCode', { code })}</p>
                )}

                <div className="pt-2 text-center">
                  <Link href="/">
                    <Button variant="secondary" size="sm">
                      {t('backHome')}
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted">{t('disclaimer')}</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn('text-sm font-semibold text-ink', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}
