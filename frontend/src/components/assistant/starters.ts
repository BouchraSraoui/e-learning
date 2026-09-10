import type { LucideIcon } from 'lucide-react';
import { AlarmClock, Award, BookOpen, GraduationCap, ShieldCheck, TrendingUp } from 'lucide-react';

import type { Locale } from '@/i18n/config';

export type AssistantStarter = {
  key: string;
  icon: LucideIcon;
  group: 'today' | 'earlier';
  prompt: Record<Locale, string>;
};

export const ASSISTANT_STARTERS: AssistantStarter[] = [
  {
    key: 'due',
    icon: AlarmClock,
    group: 'today',
    prompt: {
      fr: 'Combien de cours obligatoires me reste-t-il ?',
      en: 'How many mandatory courses do I have left?',
    },
  },
  {
    key: 'levelup',
    icon: TrendingUp,
    group: 'today',
    prompt: {
      fr: 'Comment gagner des points et progresser ?',
      en: 'How do I earn badges and points?',
    },
  },
  {
    key: 'progress',
    icon: BookOpen,
    group: 'today',
    prompt: {
      fr: 'Où en est ma progression ?',
      en: 'How many courses am I taking right now?',
    },
  },
  {
    key: 'certificate',
    icon: Award,
    group: 'earlier',
    prompt: {
      fr: 'Comment obtenir un certificat ?',
      en: 'How do I earn a certificate?',
    },
  },
  {
    key: 'enroll',
    icon: GraduationCap,
    group: 'earlier',
    prompt: {
      fr: 'Comment m’inscrire à un cours ?',
      en: 'How do I enrol in a course?',
    },
  },
  {
    key: 'password',
    icon: ShieldCheck,
    group: 'earlier',
    prompt: {
      fr: 'Comment réinitialiser mon mot de passe ?',
      en: 'How do I reset my password?',
    },
  },
];
