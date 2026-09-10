import { BadgeCheck, BookOpen, GraduationCap, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/ui/logo';

const BULLET_ICONS = [BookOpen, BadgeCheck, Users];

export function BrandPanel() {
  const t = useTranslations('auth');
  const tApp = useTranslations('app');
  const bullets = [t('bullet1'), t('bullet2'), t('bullet3')];
  const year = new Date().getFullYear();

  return (
    <div className="relative hidden overflow-hidden bg-auth-panel p-10 text-white lg:flex lg:flex-col xl:p-12">
      <Logo variant="light" size="lg" />

      <div className="relative z-10 mt-auto max-w-md">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-[2.75rem]">
          {t('brandHeading')}
        </h1>
        <ul className="mt-8 space-y-4">
          {bullets.map((text, i) => {
            const Icon = BULLET_ICONS[i];
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/12 text-white">
                  <Icon size={18} />
                </span>
                <span className="pt-1.5 text-sm font-medium text-white/90">{text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="relative z-10 mt-auto pt-10 text-xs text-white/55">
        {tApp('copyright', { year })}
      </p>

      <GraduationCap
        className="pointer-events-none absolute -bottom-10 end-0 h-72 w-72 text-white/[0.06]"
        strokeWidth={1}
        aria-hidden
      />
    </div>
  );
}
