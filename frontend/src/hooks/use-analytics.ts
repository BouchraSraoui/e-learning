'use client';

import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';

export function useAnalytics() {
  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => services.analytics.overview(),
  });
}
