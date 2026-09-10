import {
  AlignLeft,
  FileText,
  Headphones,
  type LucideIcon,
  Presentation,
  Video,
} from 'lucide-react';
import type { Accent, ContentType, CourseLevel } from '@/types';

export type Tone = 'neutral' | 'primary' | 'brand' | 'success' | 'warning' | 'danger' | 'violet';

export const CONTENT_TYPE_ICON: Record<ContentType, LucideIcon> = {
  video: Video,
  audio: Headphones,
  pdf: FileText,
  slides: Presentation,
  text: AlignLeft,
};

export function accentTone(accent: Accent | null | undefined): Tone {
  switch (accent) {
    case 'brand':
      return 'brand';
    case 'violet':
      return 'violet';
    case 'emerald':
      return 'success';
    case 'amber':
      return 'warning';
    case 'rose':
      return 'danger';
    default:
      return 'primary';
  }
}

export function levelTone(level: CourseLevel): Tone {
  switch (level) {
    case 'beginner':
      return 'success';
    case 'intermediate':
      return 'brand';
    case 'advanced':
      return 'violet';
  }
}

export function accentGradient(accent: Accent | null | undefined): string {
  switch (accent) {
    case 'brand':
      return 'from-brand-400 to-brand-600';
    case 'violet':
      return 'from-violet-400 to-violet-600';
    case 'emerald':
      return 'from-emerald-400 to-emerald-600';
    case 'amber':
      return 'from-amber-400 to-amber-500';
    case 'rose':
      return 'from-rose-400 to-rose-600';
    default:
      return 'from-primary-400 to-primary-600';
  }
}
