'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import type { CourseFilters } from '@/types';

export function useCourses(filters: CourseFilters) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => services.courses.list(filters),
    placeholderData: keepPreviousData,
  });
}

/** Public library glimpse for the landing hero — safe for anonymous visitors. */
export function useLandingPreview() {
  return useQuery({
    queryKey: ['landing-preview'],
    queryFn: () => services.courses.landingPreview(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

function isNotFoundError(error: unknown): boolean {
  const e = error as { code?: string; response?: { status?: number } } | null;
  return Boolean(e && (e.code === 'not_found' || e.response?.status === 404));
}

export function useCourse(slug: string, options?: { freshOnMount?: boolean }) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: () => services.courses.getBySlug(slug),
    enabled: Boolean(slug),
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
    // The learn page opts in: lesson media is hidden by the API until the viewer
    // is enrolled, and enrollment can happen without a client mutation to refetch
    // (a manager assigning the course, or enrolling in another tab). Within the
    // global 30s staleTime a plain mount would reuse the media-stripped copy cached
    // while browsing → "No media is available", so force a fresh, enrolled-context
    // fetch on mount. Other callers keep the shared 30s staleTime.
    ...(options?.freshOnMount ? { staleTime: 0, refetchOnMount: 'always' as const } : {}),
  });
}
