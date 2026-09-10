'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import type { FeedbackInput } from '@/types';

export function useCourseFeedback(courseSlug: string) {
  return useQuery({
    queryKey: ['feedback', courseSlug],
    queryFn: () => services.engagement.getFeedback(courseSlug),
    enabled: Boolean(courseSlug),
  });
}

export function useSubmitFeedback(courseSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FeedbackInput) => services.engagement.submitFeedback(courseSlug, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', courseSlug] }),
  });
}
