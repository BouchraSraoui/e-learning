import type { ContentType, CourseAudience, CourseLevel, QuestionType } from '@/types';

export type CourseLanguage = 'fr' | 'en';

export interface DraftLesson {
  id: string;
  title: string;
  type: ContentType;
  durationMinutes: number;
  file?: File | null;
  // Storage-only marker: the autosaved draft can't hold the File itself, so it
  // records that one was attached and the restore path warns about the loss.
  hadFile?: boolean;
}

// Mirrors backend courses/validators.py CONTENT_TYPE_EXTENSIONS + per-type caps.
export const LESSON_FILE_EXTENSIONS: Record<ContentType, string[]> = {
  video: ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'],
  audio: ['.mp3', '.m4a', '.aac', '.wav', '.oga'],
  pdf: ['.pdf'],
  slides: ['.pdf', '.ppt', '.pptx', '.key', '.odp'],
  text: [],
};

export const LESSON_FILE_MAX_MB: Record<ContentType, number> = {
  video: 500,
  audio: 100,
  pdf: 50,
  slides: 50,
  text: 0,
};

// DRF's auto-mapped FileField also enforces Django's default 100-char filename cap
// and rejects empty files — mirror both so a pick can't pass here and 400 at publish.
export const LESSON_FILE_NAME_MAX = 100;

export type LessonFileIssue =
  | { kind: 'type'; allowed: string }
  | { kind: 'size'; maxMb: number }
  | { kind: 'empty' }
  | { kind: 'name'; max: number };

export function lessonFileIssue(file: File, type: ContentType): LessonFileIssue | null {
  const exts = LESSON_FILE_EXTENSIONS[type];
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!exts.includes(ext)) {
    return { kind: 'type', allowed: exts.map((e) => e.slice(1)).join(', ') };
  }
  if (file.size === 0) return { kind: 'empty' };
  if (file.name.length > LESSON_FILE_NAME_MAX) return { kind: 'name', max: LESSON_FILE_NAME_MAX };
  const maxMb = LESSON_FILE_MAX_MB[type];
  if (file.size > maxMb * 1024 * 1024) return { kind: 'size', maxMb };
  return null;
}

// File objects can't survive JSON.stringify (they serialize to {}), so the
// localStorage autosave persists chapters without them — keeping only a
// hadFile marker so the restore path can warn that attachments were lost.
export function storableChapters(chapters: DraftChapter[]): DraftChapter[] {
  return chapters.map(({ lessons, ...chapter }) => ({
    ...chapter,
    lessons: lessons.map(({ file, ...lesson }) => ({ ...lesson, hadFile: Boolean(file) })),
  }));
}

export interface DraftChapter {
  id: string;
  title: string;
  collapsed: boolean;
  lessons: DraftLesson[];
}

export interface DraftOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface DraftQuestion {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  options: DraftOption[];
}

export interface DraftDetails {
  title: string;
  description: string;
  categoryId: string;
  level: CourseLevel;
  language: CourseLanguage;
  audience: CourseAudience;
  departmentId: string;
  mandatory: boolean;
  issuesCertificate: boolean;
  internalOnly: boolean;
  sequentialUnlock: boolean;
}

export interface DraftQuiz {
  passScore: number;
  shuffleQuestions: boolean;
  revealAnswers: boolean;
  questions: DraftQuestion[];
}

export interface CourseDraft {
  details: DraftDetails;
  chapters: DraftChapter[];
  quiz: DraftQuiz;
}

export function uid(prefix = 'd'): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

export function emptyDraft(): CourseDraft {
  return {
    details: {
      title: '',
      description: '',
      categoryId: '',
      level: 'beginner',
      language: 'fr',
      audience: 'open',
      departmentId: '',
      mandatory: false,
      issuesCertificate: true,
      internalOnly: false,
      sequentialUnlock: false,
    },
    chapters: [],
    quiz: {
      passScore: 70,
      shuffleQuestions: false,
      revealAnswers: false,
      questions: [],
    },
  };
}

export function blankChapter(): DraftChapter {
  return { id: uid('ch'), title: '', collapsed: false, lessons: [] };
}

export function blankLesson(type: ContentType = 'video'): DraftLesson {
  return { id: uid('ls'), title: '', type, durationMinutes: 5, file: null };
}

export function blankOption(correct = false): DraftOption {
  return { id: uid('op'), text: '', correct };
}

export function blankQuestion(): DraftQuestion {
  return {
    id: uid('qn'),
    text: '',
    type: 'single',
    points: 1,
    options: [blankOption(true), blankOption(false), blankOption(false), blankOption(false)],
  };
}

export const totalLessons = (chapters: DraftChapter[]): number =>
  chapters.reduce((n, c) => n + c.lessons.length, 0);

export const totalDuration = (chapters: DraftChapter[]): number =>
  chapters.reduce((n, c) => n + c.lessons.reduce((m, l) => m + (Number(l.durationMinutes) || 0), 0), 0);

export const totalAttachments = (chapters: DraftChapter[]): number =>
  chapters.reduce((n, c) => n + c.lessons.filter((l) => l.file).length, 0);

export const totalPoints = (questions: DraftQuestion[]): number =>
  questions.reduce((n, q) => n + (Number(q.points) || 0), 0);

export function inferPrimaryFormat(chapters: DraftChapter[]): ContentType {
  return chapters.find((c) => c.lessons.length > 0)?.lessons[0]?.type ?? 'video';
}
