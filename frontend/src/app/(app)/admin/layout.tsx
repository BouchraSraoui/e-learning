import { NetworkGuard } from '@/components/app/network-guard';

// The whole management console is on-net only (spec 2.6.2). One guard here covers
// every /admin/* page; each page keeps its own RoleGuard for role checks.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <NetworkGuard>{children}</NetworkGuard>;
}
