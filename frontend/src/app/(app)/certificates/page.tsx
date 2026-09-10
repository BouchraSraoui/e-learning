'use client';

import { Award, Download, ShieldCheck, SquareArrowOutUpRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useCertificates } from '@/hooks/use-certificates';
import { services } from '@/services';
import type { Certificate } from '@/types';

export default function CertificatesPage() {
  const t = useTranslations('certificate');
  const tc = useTranslations('common');
  const { data, isPending } = useCertificates();

  if (isPending) return <LoadingState label={tc('loading')} />;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Award}
          title={t('emptyTitle')}
          description={t('emptyHint')}
          action={
            <Link href="/my-learning">
              <Button>{t('goToMyLearning')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))}
        </div>
      )}
    </div>
  );
}

function CertificateCard({ cert }: { cert: Certificate }) {
  const t = useTranslations('certificate');
  const locale = useLocale();
  const issued = new Date(cert.issuedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="overflow-hidden">
      <div className="bg-auth-panel p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
            <Award size={22} />
          </span>
          <Badge tone="success">
            <ShieldCheck size={12} />
            {cert.isValid ? t('valid') : t('invalid')}
          </Badge>
        </div>
        <h3 className="mt-3 text-lg font-bold">{cert.courseTitle}</h3>
        <p className="mt-1 text-sm text-white/80">{t('issuedOn', { date: issued })}</p>
      </div>
      <CardBody className="space-y-3">
        <div>
          <p className="text-xs text-muted">{t('code')}</p>
          <p className="font-mono text-sm font-semibold text-ink">{cert.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={services.certificates.downloadUrl(cert.code)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm">
              <Download size={15} />
              {t('download')}
            </Button>
          </a>
          <Link href={`/verify/${cert.code}`} target="_blank">
            <Button size="sm" variant="secondary">
              <SquareArrowOutUpRight size={15} />
              {t('verify')}
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
