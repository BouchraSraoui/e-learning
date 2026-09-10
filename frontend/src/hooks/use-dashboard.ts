'use client';

import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => services.dashboard.get(),
  });
}
