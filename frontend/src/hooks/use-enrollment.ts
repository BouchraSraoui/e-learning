'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import type { LessonProgressInput } from '@/types';

export function useMyEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: () => services.progress.myEnrollments(),
  });
}

export function useEnrollment(slug: string) {
  return useQuery({
    queryKey: ['enrollment', slug],
    queryFn: () => services.progress.getEnrollment(slug),
    enabled: Boolean(slug),
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => services.progress.enroll(slug),
    onSuccess: async (enrollment) => {
      qc.setQueryData(['enrollment', enrollment.course.slug], enrollment);
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      // Enrollment unlocks the lesson media the course detail hides while browsing
      // (LessonSerializer strips file/url until the viewer is enrolled). Await the
      // refetch so the enroll → /learn navigation lands on a course that already
      // carries the media URLs; otherwise the learner sees "No media is available".
      await qc.invalidateQueries({ queryKey: ['course', enrollment.course.slug] });
    },
  });
}

export function useSaveLessonProgress(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, input }: { lessonId: string; input: LessonProgressInput }) =>
      services.progress.saveLessonProgress(lessonId, input),
    onSuccess: (enrollment) => {
      qc.setQueryData(['enrollment', slug], enrollment);
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
