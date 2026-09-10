'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import type { QuizResponses } from '@/types';

export function useQuiz(id: string | null) {
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: () => services.assessments.getQuiz(id as string),
    enabled: Boolean(id),
  });
}

export function useSubmitAttempt(id: string, courseSlug?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (responses: QuizResponses) => services.assessments.submitAttempt(id, responses),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz', id] });
      if (courseSlug) qc.invalidateQueries({ queryKey: ['enrollment', courseSlug] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
