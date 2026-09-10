'use client';

import { useState } from 'react';
import { AssistantFab } from './assistant-fab';
import { NavDrawer } from './nav-drawer';
import { NetworkModeBanner } from './network-mode';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Topbar onOpenNav={() => setNavOpen(true)} />
      <NetworkModeBanner />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <AssistantFab />
    </div>
  );
}
