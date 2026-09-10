'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/ui/logo';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/auth-context';

export function AppGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <Spinner className="text-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
