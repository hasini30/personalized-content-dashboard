'use client';

import * as React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from '@/components/ui/PageTransition';
import { useTranslation } from 'react-i18next';
import { getLanguageDirection } from '@/lib/languages';

export interface AppLayoutProps {
  children: React.ReactNode;
  liveUpdatesCount?: number;
  onApplyLiveUpdates?: () => void;
}

export function AppLayout({ children, liveUpdatesCount = 0, onApplyLiveUpdates }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { i18n } = useTranslation();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const current = i18n.language || 'en';
      const dir = getLanguageDirection(current);
      document.documentElement.dir = dir;
      document.documentElement.lang = current;
    }
  }, [i18n.language]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        onMobileMenuToggle={() => setMobileMenuOpen(true)}
        liveUpdatesCount={liveUpdatesCount}
        onApplyLiveUpdates={onApplyLiveUpdates}
      />
      <div className="flex flex-1">
        <Sidebar isMobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 sm:px-6 md:px-8 pb-12 max-w-7xl mx-auto w-full outline-none"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
