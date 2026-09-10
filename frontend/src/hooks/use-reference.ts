'use client';

import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => services.reference.departments(),
    staleTime: Infinity,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => services.reference.categories(),
    staleTime: Infinity,
  });
}
