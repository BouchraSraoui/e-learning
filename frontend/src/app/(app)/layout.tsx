import { AppGuard } from '@/components/app/app-guard';
import { AppShell } from '@/components/app/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGuard>
      <AppShell>{children}</AppShell>
    </AppGuard>
  );
}
