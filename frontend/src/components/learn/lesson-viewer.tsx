'use client';

import { Download, FileWarning, Presentation, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { useNetworkMode } from '@/context/network-mode-context';
import { services } from '@/services';
import type { Lesson, LessonProgressInput } from '@/types';

interface ViewerProps {
  lesson: Lesson;
  resumePosition: number;
  onProgress: (input: LessonProgressInput) => void;
  onEnded: () => void;
}

export function LessonViewer(props: ViewerProps) {
  const { lesson } = props;
  if (lesson.type === 'video' || lesson.type === 'audio') return <TimedMedia {...props} />;
  if (lesson.type === 'text') return <RichTextViewer lesson={lesson} />;
  return <DocViewer lesson={lesson} />;
}

function TimedMedia({ lesson, resumePosition, onProgress, onEnded }: ViewerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = services.progress.resolveMediaUrl(lesson);

  const cbs = useRef({ onProgress, onEnded, resumePosition });
  cbs.current = { onProgress, onEnded, resumePosition };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastTime = 0;
    let accumulated = 0; // seconds actually watched since last flush
    let sinceFlush = 0;

    const flush = (completed = false) => {
      const delta = Math.round(accumulated);
      accumulated = 0;
      sinceFlush = 0;
      if (delta > 0 || completed) {
        cbs.current.onProgress({
          resumePositionSeconds: Math.floor(el.currentTime),
          timeSpentSeconds: delta,
          completed: completed || undefined,
        });
      }
    };

    const onLoaded = () => {
      const r = cbs.current.resumePosition;
      if (r > 0 && Number.isFinite(el.duration) && r < el.duration) el.currentTime = r;
    };
    const onTime = () => {
      const gap = el.currentTime - lastTime;
      if (gap > 0 && gap < 2) {
        accumulated += gap; // ignore large jumps (seeks)
        sinceFlush += gap;
      }
      lastTime = el.currentTime;
      if (sinceFlush >= 15) flush();
    };
    const onEnd = () => {
      flush(true);
      cbs.current.onEnded();
    };

    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      flush(); // save progress when leaving the lesson
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, [src]);

  if (!src) return <NoMedia />;

  const isAudio = lesson.type === 'audio';
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink/95">
      {isAudio ? (
        <div className="flex items-center justify-center bg-slate-900 p-10">
          <audio ref={ref as unknown as React.RefObject<HTMLAudioElement>} src={src} controls className="w-full max-w-xl" />
        </div>
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video ref={ref} src={src} controls playsInline className="aspect-video w-full bg-black" />
      )}
    </div>
  );
}

function DocViewer({ lesson }: { lesson: Lesson }) {
  const t = useTranslations('learn');
  const { onNet } = useNetworkMode();
  const src = services.progress.resolveMediaUrl(lesson);
  if (!src) return <NoMedia />;
  const downloadSrc = services.progress.resolveMediaUrl(lesson, { download: true });

  // Browsers can only render PDFs natively; office formats (.pptx/.ppt/.key/
  // .odp) show an empty frame, so offer the file as a download instead.
  const name = lesson.fileName ?? null;
  const renderable = !name || /\.pdf$/i.test(name);

  // Downloads (save-to-disk) are on-net only (spec 2.6.2); inline viewing is fine.
  const downloadLink = onNet ? (
    <a href={downloadSrc} target="_blank" rel="noreferrer" className={buttonClasses({})}>
      <Download size={16} />
      {t('downloadFile')}
    </a>
  ) : (
    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <ShieldCheck size={14} />
      {t('downloadOffNet')}
    </p>
  );

  if (!renderable) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-line bg-white/60 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary">
          <Presentation size={24} />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="mt-1 text-sm text-muted">{t('cantPreview')}</p>
        </div>
        {downloadLink}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {onNet && (
        <div className="flex justify-end">
          <a
            href={downloadSrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary"
          >
            <Download size={13} />
            {t('downloadFile')}
          </a>
        </div>
      )}
      <iframe
        src={src}
        title={lesson.title}
        className="h-[68vh] w-full rounded-xl border border-line bg-white"
      />
    </div>
  );
}

function RichTextViewer({ lesson }: { lesson: Lesson }) {
  if (!lesson.richText) return <NoMedia />;
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div
        className="space-y-3 text-sm leading-relaxed text-slate-700 [&_a]:text-primary [&_a]:underline [&_li]:ms-4 [&_li]:list-disc [&_strong]:text-ink"
        dangerouslySetInnerHTML={{ __html: lesson.richText }}
      />
    </div>
  );
}

function NoMedia() {
  const t = useTranslations('learn');
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-line bg-white/60 py-16 text-center text-muted">
      <FileWarning size={28} className="text-slate-300" />
      <p className="text-sm">{t('noMedia')}</p>
    </div>
  );
}
