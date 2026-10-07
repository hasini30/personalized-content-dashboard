'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Newspaper, Flame, Heart, Sliders, User, X } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from 'react-i18next';

export interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const favoritesCount = useAppSelector((state) => state.favorites.items.length);

  const navLinks = [
    {
      label: t('nav.feed') || 'My Feed',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/' || pathname === '/feed',
    },
    {
      label: t('nav.news') || 'News',
      href: '/news',
      icon: Newspaper,
      active: pathname === '/news',
    },
    {
      label: t('nav.trending') || 'Trending',
      href: '/trending',
      icon: Flame,
      active: pathname === '/trending',
    },
    {
      label: t('nav.favorites') || 'Favorites',
      href: '/favorites',
      icon: Heart,
      active: pathname === '/favorites',
      badge: favoritesCount > 0 ? favoritesCount : undefined,
    },
    {
      label: t('nav.preferences') || 'Preferences',
      href: '/settings',
      icon: Sliders,
      active: pathname === '/settings',
    },
    {
      label: t('nav.profile') || 'Profile',
      href: '/profile',
      icon: User,
      active: pathname === '/profile',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-30 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border md:hidden">
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            FeedPulse
          </span>
          <button
            onClick={onMobileClose}
            aria-label="Close navigation sidebar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="flex-1 space-y-1.5 p-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onMobileClose}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  link.active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      link.active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-border">
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">FeedPulse v1.0</p>
            <p className="mt-0.5">Unified Multi-Source Real-Time Intelligence</p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/90 backdrop-blur-md px-2 md:hidden"
      >
        {navLinks.slice(0, 5).map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                link.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {link.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {link.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
