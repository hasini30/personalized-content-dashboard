'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Search, Menu, User, LogOut, Radio, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSearchQuery } from '@/features/feed/feedSlice';
import { useTranslation } from 'react-i18next';

export interface HeaderProps {
  onMobileMenuToggle?: () => void;
  liveUpdatesCount?: number;
  onApplyLiveUpdates?: () => void;
}

export function Header({
  onMobileMenuToggle,
  liveUpdatesCount = 0,
  onApplyLiveUpdates,
}: HeaderProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const currentSearchQuery = useAppSelector((state) => state.feed.searchQuery);
  const [localSearch, setLocalSearch] = React.useState(currentSearchQuery);

  React.useEffect(() => {
    setLocalSearch(currentSearchQuery);
  }, [currentSearchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    dispatch(setSearchQuery(val));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger & App Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open navigation sidebar"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              FP
            </div>
            <span className="hidden sm:inline font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              FeedPulse
            </span>
          </Link>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder={t('nav.searchPlaceholder') || 'Search news, movies, discussions...'}
              value={localSearch}
              onChange={handleSearchChange}
              aria-label="Search content"
              className="w-full h-9 pl-9 pr-24 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary select-none"
              title="Semantic AI-powered search"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Semantic</span>
            </span>
          </div>
        </div>

        {/* Right: Live Pill, Theme Toggle, Auth Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          {liveUpdatesCount > 0 && onApplyLiveUpdates && (
            <button
              onClick={onApplyLiveUpdates}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-full border border-primary/20 animate-pulse transition-colors"
            >
              <Radio className="h-3.5 w-3.5 text-primary" />
              <span>{liveUpdatesCount} New</span>
            </button>
          )}

          <LanguageSwitcher />
          <ThemeToggle />

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg p-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User profile"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline text-xs font-medium">{session.user.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                aria-label={t('nav.logout')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <User className="h-3.5 w-3.5" />
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
