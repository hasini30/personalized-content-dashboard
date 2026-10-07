'use client';

import * as React from 'react';
import { Sparkles, RefreshCw, Filter, ArrowUp, Compass, Radio } from 'lucide-react';
import { useGetNewsQuery, useGetMoviesQuery, useGetSocialQuery } from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setFeedScope,
  selectFeedScope,
  selectPreferredCategories,
  selectContentLanguage,
} from '@/features/preferences/preferencesSlice';
import {
  interleaveAndDeduplicate,
  applyCustomOrder,
  deduplicateContentItems,
} from '@/lib/feedUtils';
import { semanticSearchFilter } from '@/lib/semanticSearch';
import { SortableFeed } from './SortableFeed';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Pagination } from '@/components/ui/Pagination';
import { ContentItem } from '@/types/content';
import { useTranslation } from 'react-i18next';

const LIVE_ITEMS_STORAGE_KEY = 'feedpulse_applied_live_items';

export interface UnifiedFeedProps {
  incomingLiveItems?: ContentItem[];
  incomingUpdatedItems?: ContentItem[];
  latestUpdatedItem?: ContentItem | null;
  externalAppliedItems?: ContentItem[];
  onClearLiveItems?: () => void;
  isLiveConnected?: boolean;
}

export function UnifiedFeed({
  incomingLiveItems = [],
  incomingUpdatedItems = [],
  latestUpdatedItem = null,
  externalAppliedItems = [],
  onClearLiveItems,
  isLiveConnected = true,
}: UnifiedFeedProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.preferences);
  const feedScope = useAppSelector(selectFeedScope);
  const preferredCategories = useAppSelector(selectPreferredCategories);
  const contentLanguage = useAppSelector(selectContentLanguage);
  const customOrder = useAppSelector((state) => state.feed.customOrder);
  const globalSearchQuery = useAppSelector((state) => state.feed.searchQuery);

  const debouncedSearch = useDebounce(globalSearchQuery, 400);

  const [activeSourceFilter, setActiveSourceFilter] = React.useState<
    'all' | 'news' | 'movie' | 'social'
  >('all');
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [prependedItems, setPrependedItems] = React.useState<ContentItem[]>([]);
  const [autoApplyLive, setAutoApplyLive] = React.useState(true);
  const [updatedArticlesMap, setUpdatedArticlesMap] = React.useState<Record<string, ContentItem>>(
    {}
  );
  const [displayMode, setDisplayMode] = React.useState<'infinite' | 'paginated'>('infinite');
  const [isRefreshingLatest, setIsRefreshingLatest] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  // Hydrate persisted live stream items on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LIVE_ITEMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map((item: ContentItem) => {
            if (item.url && item.url.includes('globalwire.org')) {
              return { ...item, url: '#' };
            }
            return item;
          });
          setPrependedItems(sanitized);
        }
      }
    } catch {
      // Storage access error or private mode
    }
  }, []);

  // Clear stale persisted live stream items whenever content language changes
  const prevLangRef = React.useRef(contentLanguage);
  React.useEffect(() => {
    if (prevLangRef.current !== contentLanguage) {
      prevLangRef.current = contentLanguage;
      setPrependedItems([]);
      try {
        localStorage.removeItem(LIVE_ITEMS_STORAGE_KEY);
      } catch {
        // Storage access error
      }
    }
  }, [contentLanguage]);

  // Persist prependedItems across reloads
  React.useEffect(() => {
    try {
      if (prependedItems.length > 0) {
        localStorage.setItem(LIVE_ITEMS_STORAGE_KEY, JSON.stringify(prependedItems.slice(0, 30)));
      } else {
        localStorage.removeItem(LIVE_ITEMS_STORAGE_KEY);
      }
    } catch {
      // Storage write error
    }
  }, [prependedItems]);

  // Apply external applied items (e.g. from header button click)
  React.useEffect(() => {
    if (externalAppliedItems && externalAppliedItems.length > 0) {
      const sanitized = externalAppliedItems.map((item) =>
        item.url && item.url.includes('globalwire.org') ? { ...item, url: '#' } : item
      );
      setPrependedItems((prev) => {
        return deduplicateContentItems([...sanitized, ...prev]);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [externalAppliedItems]);

  // Auto-apply incoming live updates when live streaming mode is active
  React.useEffect(() => {
    if (autoApplyLive && incomingLiveItems.length > 0) {
      setPrependedItems((prev) => {
        return deduplicateContentItems([...incomingLiveItems, ...prev]);
      });
      if (onClearLiveItems) {
        onClearLiveItems();
      }
    }
  }, [autoApplyLive, incomingLiveItems, onClearLiveItems]);

  // Automatically detect and reflect updates to existing articles in place without page reload
  React.useEffect(() => {
    if (incomingUpdatedItems && incomingUpdatedItems.length > 0) {
      setUpdatedArticlesMap((prev) => {
        const next = { ...prev };
        for (const item of incomingUpdatedItems) {
          next[item.id] = item;
          if (item.url && item.url !== '#') {
            next[item.url] = item;
          }
        }
        return next;
      });

      // Update prependedItems in place if matching
      setPrependedItems((prev) =>
        prev.map((item) => {
          const match = incomingUpdatedItems.find(
            (u) => u.id === item.id || (u.url && u.url !== '#' && u.url === item.url)
          );
          return match ? { ...item, ...match, isUpdated: true } : item;
        })
      );
    }
  }, [incomingUpdatedItems]);

  React.useEffect(() => {
    if (latestUpdatedItem) {
      setStatusMessage(`Article updated: "${latestUpdatedItem.title.slice(0, 60)}..."`);
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [latestUpdatedItem]);

  // News fetching with scope and content language
  const {
    data: newsData,
    isLoading: isNewsLoading,
    isError: isNewsError,
    refetch: refetchNews,
    isFetching: isNewsFetching,
  } = useGetNewsQuery({
    category: activeCategory !== 'all' ? activeCategory : undefined,
    q: debouncedSearch || undefined,
    page,
    pageSize: 6,
    scope: feedScope === 'forYou' ? 'preferred' : 'all',
    preferredCategories: preferredCategories.join(','),
    lang: contentLanguage,
  });

  const preferredMovieGenres = preferences.movieGenres || [];
  const movieGenreParam =
    feedScope === 'forYou' && preferredMovieGenres.length > 0
      ? preferredMovieGenres.join(',')
      : undefined;

  const {
    data: moviesData,
    isLoading: isMoviesLoading,
    isError: isMoviesError,
    refetch: refetchMovies,
    isFetching: isMoviesFetching,
  } = useGetMoviesQuery({
    genre: movieGenreParam,
    trending: true,
    q: debouncedSearch || undefined,
    lang: contentLanguage,
    page,
    pageSize: 6,
  });

  const {
    data: socialData,
    isLoading: isSocialLoading,
    isError: isSocialError,
    refetch: refetchSocial,
    isFetching: isSocialFetching,
  } = useGetSocialQuery({
    hashtag: activeCategory !== 'all' ? activeCategory : undefined,
    q: debouncedSearch || undefined,
    lang: contentLanguage,
    page,
    pageSize: 6,
  });

  // Reset pagination when category, filter, search, scope, or language changes
  React.useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    activeCategory,
    activeSourceFilter,
    feedScope,
    contentLanguage,
    preferences.categories,
    preferences.movieGenres,
  ]);

  // Combine and interleave items
  const combinedItems = React.useMemo(() => {
    let newsList = newsData?.items || [];
    let moviesList = moviesData?.items || [];
    let socialList = socialData?.items || [];

    // Filter prependedItems according to activeCategory and activeSourceFilter
    let liveList = prependedItems;
    if (activeCategory !== 'all') {
      liveList = liveList.filter(
        (item) => item.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (activeSourceFilter === 'news') {
      liveList = liveList.filter((item) => item.source === 'news');
      moviesList = [];
      socialList = [];
    } else if (activeSourceFilter === 'movie') {
      liveList = liveList.filter((item) => item.source === 'movie');
      newsList = [];
      socialList = [];
    } else if (activeSourceFilter === 'social') {
      liveList = liveList.filter((item) => item.source === 'social');
      newsList = [];
      moviesList = [];
    }

    // Helper to apply live in-place updates from news sources
    const applyLiveArticleUpdates = (items: ContentItem[]): ContentItem[] => {
      if (Object.keys(updatedArticlesMap).length === 0) return items;
      return items.map((item) => {
        const directMatch = updatedArticlesMap[item.id];
        if (directMatch) return { ...item, ...directMatch, isUpdated: true };
        if (item.url && item.url !== '#') {
          const urlMatch = updatedArticlesMap[item.url];
          if (urlMatch) return { ...item, ...urlMatch, isUpdated: true };
        }
        return item;
      });
    };

    // Global semantic relevance ranking during active search
    if (debouncedSearch) {
      const allCandidates = [...liveList, ...newsList, ...moviesList, ...socialList];
      const ranked = semanticSearchFilter(allCandidates, debouncedSearch);
      const withUpdates = applyLiveArticleUpdates(ranked);
      const deduped = deduplicateContentItems(withUpdates);
      return applyCustomOrder(deduped, customOrder);
    }

    const interleaved = interleaveAndDeduplicate(newsList, moviesList, socialList);
    const allItems = deduplicateContentItems([...liveList, ...interleaved]);
    const withUpdates = applyLiveArticleUpdates(allItems);

    // Apply custom user order
    return applyCustomOrder(withUpdates, customOrder);
  }, [
    newsData?.items,
    moviesData?.items,
    socialData?.items,
    activeSourceFilter,
    activeCategory,
    prependedItems,
    updatedArticlesMap,
    customOrder,
    debouncedSearch,
  ]);

  // Partition items into preferred and other for "For You" view
  const { preferredItems, otherItems, hasSplitSections } = React.useMemo(() => {
    if (
      feedScope !== 'forYou' ||
      activeCategory !== 'all' ||
      preferredCategories.length === 0 ||
      debouncedSearch
    ) {
      return { preferredItems: combinedItems, otherItems: [], hasSplitSections: false };
    }

    const prefList = preferredCategories.map((c) => c.toLowerCase());
    const preferred: ContentItem[] = [];
    const others: ContentItem[] = [];

    combinedItems.forEach((item) => {
      const isItemPreferred =
        item.isPreferred ||
        (item.source === 'news' && prefList.includes(item.category.toLowerCase()));
      if (isItemPreferred) {
        preferred.push(item);
      } else {
        others.push(item);
      }
    });

    const canSplit = preferred.length > 0 && others.length > 0;
    return {
      preferredItems: canSplit ? preferred : combinedItems,
      otherItems: canSplit ? others : [],
      hasSplitSections: canSplit,
    };
  }, [combinedItems, feedScope, activeCategory, preferredCategories, debouncedSearch]);

  // Paginated window slicing
  const displayedCombinedItems = React.useMemo(() => {
    if (displayMode === 'infinite') return combinedItems;
    const pageSize = 12;
    const start = Math.max(0, (page - 1) * pageSize);
    if (combinedItems.length > start) {
      return combinedItems.slice(start, start + pageSize);
    }
    return combinedItems.slice(0, pageSize);
  }, [combinedItems, displayMode, page]);

  const displayedPreferredItems = React.useMemo(() => {
    if (displayMode === 'infinite') return preferredItems;
    const pageSize = 12;
    const start = Math.max(0, (page - 1) * pageSize);
    if (preferredItems.length > start) {
      return preferredItems.slice(start, start + pageSize);
    }
    return preferredItems.slice(0, pageSize);
  }, [preferredItems, displayMode, page]);

  const displayedOtherItems = React.useMemo(() => {
    if (displayMode === 'infinite') return otherItems;
    const pageSize = 12;
    const start = Math.max(0, (page - 1) * pageSize);
    if (otherItems.length > start) {
      return otherItems.slice(start, start + pageSize);
    }
    return otherItems.slice(0, pageSize);
  }, [otherItems, displayMode, page]);

  const hasMore = Boolean(newsData?.hasMore || moviesData?.hasMore || socialData?.hasMore);

  const isInitialLoading = page === 1 && (isNewsLoading || isMoviesLoading || isSocialLoading);
  const isFetchingMore = page > 1 && (isNewsFetching || isMoviesFetching || isSocialFetching);
  const hasError = page === 1 && isNewsError && isMoviesError && isSocialError;

  const handleLoadMore = React.useCallback(() => {
    if (hasMore && !isFetchingMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetchingMore]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore: hasMore && displayMode === 'infinite',
    isLoading: isFetchingMore || displayMode === 'paginated',
  });

  const handleApplyLiveItems = () => {
    if (incomingLiveItems.length > 0) {
      setPrependedItems((prev) => {
        return deduplicateContentItems([...incomingLiveItems, ...prev]);
      });
      if (onClearLiveItems) {
        onClearLiveItems();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearLiveUpdates = () => {
    setPrependedItems([]);
    try {
      localStorage.removeItem(LIVE_ITEMS_STORAGE_KEY);
    } catch {}
  };

  const handleRefetchAll = () => {
    refetchNews();
    refetchMovies();
    refetchSocial();
  };

  const handleCheckLatestStories = async () => {
    setIsRefreshingLatest(true);
    setStatusMessage('Checking live channels for latest stories...');

    if (incomingLiveItems.length > 0) {
      handleApplyLiveItems();
    }

    try {
      await Promise.all([refetchNews(), refetchMovies(), refetchSocial()]);
      setStatusMessage('Feed updated with latest breaking stories!');
    } catch {
      setStatusMessage('Feed is up to date.');
    } finally {
      setTimeout(() => {
        setIsRefreshingLatest(false);
        setTimeout(() => setStatusMessage(null), 3000);
      }, 600);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Scope Toggle: "For You" | "All News" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border shadow-inner">
          <button
            type="button"
            onClick={() => dispatch(setFeedScope('forYou'))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              feedScope === 'forYou'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('feed.forYou') || 'For You'}</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch(setFeedScope('all'))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              feedScope === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>{t('feed.allNews') || 'All News'}</span>
          </button>
        </div>

        {/* Source Filter Tabs & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium">
            {(
              [
                { id: 'all', label: t('feed.allContent') || 'All Content' },
                { id: 'news', label: t('feed.news') || 'News' },
                { id: 'movie', label: t('feed.movies') || 'Movies' },
                { id: 'social', label: t('feed.social') || 'Social' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveSourceFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeSourceFilter === filter.id
                    ? 'bg-card text-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Display Mode: Infinite vs Pages */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDisplayMode('infinite')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                displayMode === 'infinite'
                  ? 'bg-card text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Infinite Scroll"
            >
              {t('feed.infinite') || 'Infinite'}
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('paginated')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                displayMode === 'paginated'
                  ? 'bg-card text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Paginated Mode"
            >
              {t('feed.pages') || 'Pages'}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefetchAll}
            disabled={isNewsFetching || isMoviesFetching || isSocialFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isNewsFetching || isMoviesFetching || isSocialFetching ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">{t('feed.refresh') || 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Category Quick Pills & Live Stream Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>{t('feed.category') || 'Category:'}</span>
          </span>
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {feedScope === 'forYou'
              ? t('feed.allPreferred') || 'All Preferred'
              : t('feed.allContent') || 'All Topics'}
          </button>
          {preferences.categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-xs capitalize rounded-full border transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary font-semibold'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {t(`categories.${cat.toLowerCase()}`) || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Status & Live Controls Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-xs font-semibold text-foreground">
              {isLiveConnected
                ? t('feed.liveConnected') || 'Live Stream Active'
                : t('feed.liveConnecting') || 'Connecting Live Feed...'}
            </span>
          </div>

          {prependedItems.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {prependedItems.length} {t('feed.liveStories') || 'live updates added'}
              </span>
              <button
                type="button"
                onClick={handleClearLiveUpdates}
                className="hover:underline text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                title="Clear applied live stream items and revert to standard feed"
              >
                {t('feed.clear') || 'Clear'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Manual "Check for Latest Stories" button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckLatestStories}
            disabled={isRefreshingLatest || isNewsFetching}
            className="gap-1.5 text-xs h-8"
          >
            <Sparkles
              className={`h-3.5 w-3.5 text-primary ${isRefreshingLatest ? 'animate-spin' : ''}`}
            />
            <span>
              {isRefreshingLatest
                ? t('feed.checking') || 'Checking...'
                : t('feed.checkForLatest') || 'Check for Latest Stories'}
            </span>
          </Button>

          {/* Auto-apply toggle */}
          <button
            type="button"
            onClick={() => setAutoApplyLive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border transition-all h-8 ${
              autoApplyLive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold shadow-sm'
                : 'bg-muted/60 text-muted-foreground border-border hover:text-foreground'
            }`}
            title="Toggle whether new updates automatically flow into your feed or await manual click"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>
              {autoApplyLive
                ? t('live.autoApplyActive') || 'Auto-Update: ON'
                : t('live.autoApplyOff') || 'Auto-Update: OFF'}
            </span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 px-4 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Floating Live Update Pill (when not in auto-apply mode) */}
      {!autoApplyLive && incomingLiveItems.length > 0 && (
        <div className="sticky top-20 z-30 flex justify-center animate-in fade-in slide-in-from-top-4">
          <button
            onClick={handleApplyLiveItems}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowUp className="h-4 w-4" />
            <span>
              {incomingLiveItems.length}{' '}
              {incomingLiveItems.length > 1
                ? t('feed.newUpdatesPlural') || 'new updates'
                : t('feed.newUpdates') || 'new update'}{' '}
              {t('feed.available') || 'available • Click to view'}
            </span>
          </button>
        </div>
      )}

      {/* Main Content States */}
      {isInitialLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col rounded-xl border border-border bg-card p-4 space-y-4"
            >
              <Skeleton className="aspect-[16/9] w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md self-end" />
            </div>
          ))}
        </div>
      )}

      {hasError && (
        <ErrorState
          title="Could not load feed"
          message="An error occurred while connecting to feed services. Please try again."
          onRetry={handleRefetchAll}
        />
      )}

      {!isInitialLoading && !hasError && combinedItems.length === 0 && (
        <EmptyState
          title={t('feed.noResults') || 'No results found'}
          description={
            debouncedSearch
              ? `No content matches "${debouncedSearch}". Try another keyword.`
              : t('feed.noResultsDesc') || 'No items match your current category preferences.'
          }
          actionLabel={t('feed.resetFilters') || 'Reset Filters'}
          onAction={() => {
            setActiveCategory('all');
            setActiveSourceFilter('all');
          }}
        />
      )}

      {!isInitialLoading && !hasError && combinedItems.length > 0 && (
        <>
          {/* If "For You" has split sections, show preferred items, then section divider, then other items */}
          {hasSplitSections ? (
            <div className="space-y-8">
              <div>
                <SortableFeed items={displayedPreferredItems} />
              </div>

              <div className="flex items-center gap-4 my-8" aria-label="Divider for other topics">
                <div className="h-px flex-1 bg-border" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground border border-border shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>{t('feed.moreOtherTopics') || 'More from other topics'}</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div>
                <SortableFeed items={displayedOtherItems} />
              </div>
            </div>
          ) : (
            <SortableFeed items={displayedCombinedItems} />
          )}

          {/* Infinite Scroll Sentinel or Pagination Controls */}
          {displayMode === 'infinite' ? (
            <div
              ref={sentinelRef}
              className="py-8 my-4 flex flex-col items-center justify-center min-h-[96px] w-full"
              aria-live="polite"
            >
              {isFetchingMore ? (
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-card border border-border shadow-sm text-sm text-foreground animate-in fade-in">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="font-medium">
                    {t('feed.loadingMore') || 'Loading more stories...'}
                  </span>
                </div>
              ) : hasMore ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                  <span>
                    {t('feed.scrollMore') || 'Scroll down for continuous infinite news...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border border-border/50">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>{t('feed.allCaughtUp') || "You're all caught up!"}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-4 border-t border-border/60">
              <Pagination
                currentPage={page}
                totalPages={Math.max(page + (hasMore ? 1 : 0), 1)}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                isLoading={isFetchingMore}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
