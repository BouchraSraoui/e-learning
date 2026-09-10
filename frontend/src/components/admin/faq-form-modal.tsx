'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useSaveFaq } from '@/hooks/use-assistant';
import { locales, localeNames, type Locale } from '@/i18n/config';
import type { FaqEntry } from '@/types';

export function FaqFormModal({
  open,
  onClose,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  entry: FaqEntry | null;
}) {
  const t = useTranslations('faq');
  const tc = useTranslations('common');
  const uiLocale = useLocale() as Locale;
  const toast = useToast();
  const saveFaq = useSaveFaq();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [language, setLanguage] = useState<Locale>('fr');
  const [order, setOrder] = useState('');
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setQuestion(entry?.question ?? '');
    setAnswer(entry?.answer ?? '');
    setCategory(entry?.category ?? '');
    setKeywords(entry?.keywords.join(', ') ?? '');
    setLanguage(entry?.language ?? uiLocale);
    setOrder(entry ? String(entry.order) : '');
    setPublished(entry?.published ?? true);
  }, [open, entry, uiLocale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError(t('requiredFields'));
      return;
    }
    try {
      await saveFaq.mutateAsync({
        id: entry?.id,
        input: {
          question: question.trim(),
          answer: answer.trim(),
          category: category.trim(),
          keywords: keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          language,
          order: order ? Number(order) : undefined,
          published,
        },
      });
      toast.success(t('saved'));
      onClose();
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={entry ? t('editEntry') : t('newEntry')}
      description={t('formHint')}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <Input
          label={t('question')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder')}
          required
        />
        <Textarea
          label={t('answer')}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('answerPlaceholder')}
          rows={4}
          required
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={t('category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t('categoryPlaceholder')}
          />
          <Select
            label={tc('language')}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Locale)}
            options={locales.map((l) => ({ value: l, label: localeNames[l] }))}
          />
          <Input
            type="number"
            label={t('order')}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            hint={t('orderHint')}
          />
        </div>
        <Input
          label={t('keywords')}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder={t('keywordsPlaceholder')}
          hint={t('keywordsHint')}
        />
        <Checkbox
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          label={t('publishedLabel')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={saveFaq.isPending}>
            {tc('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
