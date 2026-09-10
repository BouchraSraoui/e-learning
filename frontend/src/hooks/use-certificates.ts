'use client';

import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';

export function useCertificates() {
  return useQuery({
    queryKey: ['certificates'],
    queryFn: () => services.certificates.list(),
  });
}

export function useVerify(code: string) {
  return useQuery({
    queryKey: ['verify', code],
    queryFn: () => services.certificates.verify(code),
    enabled: Boolean(code),
    retry: false,
  });
}
