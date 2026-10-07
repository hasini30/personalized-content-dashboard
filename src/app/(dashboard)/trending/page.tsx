'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ContentCard } from '@/components/cards/ContentCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { useGetTrendingQuery, useGetMoviesQuery, useGetSocialQuery } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { Flame, Newspaper, Film, MessageSquare, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { deduplicateContentItems } from '@/lib/feedUtils';

export default function TrendingPage() {
  const { t } = useTranslation();
  const preferences = useAppSelector((state) => state.preferences);
  const preferredCategories = preferences.categories.map((c) => c.toLowerCase());
  const contentLanguage = preferences.contentLanguage || 'en';

  const [activeTab, setActiveTab] = React.useState<'news' | 'movie' | 'social'>('news');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [displayMode, setDisplayMode] = React.useState<'infinite' | 'paginated'>('infinite');

  // Reset page when tab changes
  const handleTabChange = (newTab: 'news' | 'movie' | 'social') => {
    setActiveTab(newTab);
    setPage(1);
  };

  const {
    data: newsData,
    isLoading: isNewsLoading,
    isFetching: isNewsFetching,
    isError: isNewsError,
    refetch: refetchNews,
  } = useGetTrendingQuery({
    preferredCategories: preferredCategories.join(','),
    lang: contentLanguage,
    page,
    pageSize,
  });

  const {
    data: moviesData,
    isLoading: isMoviesLoading,
    isFetching: isMoviesFetching,
    isError: isMoviesError,
    refetch: refetchMovies,
  } = useGetMoviesQuery({
    trending: true,
    lang: contentLanguage,
    page,
    pageSize,
  });

  const {
    data: socialData,
    isLoading: isSocialLoading,
    isFetching: isSocialFetching,
    isError: isSocialError,
    refetch: refetchSocial,
  } = useGetSocialQuery({
    lang: contentLanguage,
    page,
    pageSize,
  });

  const currentItems = React.useMemo(() => {
    switch (activeTab) {
      case 'news':
        return deduplicateContentItems(newsData?.items || []);
      case 'movie':
        return deduplicateContentItems(moviesData?.items || []);
      case 'social':
        return deduplicateContentItems(socialData?.items || []);
    }
  }, [activeTab, newsData?.items, moviesData?.items, socialData?.items]);

  const hasMore = Boolean(
    (activeTab === 'news' && newsData?.hasMore) ||
    (activeTab === 'movie' && moviesData?.hasMore) ||
    (activeTab === 'social' && socialData?.hasMore)
  );

  const isInitialLoading =
    page === 1 &&
    ((activeTab === 'news' && isNewsLoading) ||
      (activeTab === 'movie' && isMoviesLoading) ||
      (activeTab === 'social' && isSocialLoading));

  const isFetchingMore =
    page > 1 &&
    ((activeTab === 'news' && isNewsFetching) ||
      (activeTab === 'movie' && isMoviesFetching) ||
      (activeTab === 'social' && isSocialFetching));

  const isError =
    (activeTab === 'news' && isNewsError) ||
    (activeTab === 'movie' && isMoviesError) ||
    (activeTab === 'social' && isSocialError);

  const handleLoadMore = React.useCallback(() => {
    if (hasMore && !isFetchingMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetchingMore]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore: hasMore && displayMode === 'infinite',
    isLoading: isFetchingMore || isInitialLoading || displayMode === 'paginated',
  });

  // Windowed items when in paginated mode
  const displayedItems = React.useMemo(() => {
    if (displayMode === 'infinite') return currentItems;
    const start = Math.max(0, (page - 1) * pageSize);
    if (currentItems.length > start) {
      return currentItems.slice(start, start + pageSize);
    }
    return currentItems.slice(0, pageSize);
  }, [currentItems, displayMode, page, pageSize]);

  const handleRetry = () => {
    if (activeTab === 'news') refetchNews();
    if (activeTab === 'movie') refetchMovies();
    if (activeTab === 'social') refetchSocial();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-500" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('trending.title') || 'Trending Now'}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('trending.subtitle') ||
                'Top breaking stories, viral cinema releases, and trending discussions across all categories.'}
            </p>
          </div>

          {/* Display Mode: Infinite vs Pages */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium self-start sm:self-auto">
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
              Infinite
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
              Pages
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
          {[
            { id: 'news', label: t('trending.newsTab') || 'News Headlines', icon: Newspaper },
            { id: 'movie', label: t('trending.moviesTab') || 'Trending Movies', icon: Film },
            { id: 'social', label: t('trending.socialTab') || 'Viral Social', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as 'news' | 'movie' | 'social')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content States */}
        {isInitialLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col rounded-xl border border-border bg-card p-4 space-y-4"
              >
                <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {isError && currentItems.length === 0 && (
          <ErrorState
            title="Failed to load trending content"
            message="We could not fetch the latest trending items. Please retry."
            onRetry={handleRetry}
          />
        )}

        {!isInitialLoading && !isError && currentItems.length === 0 && (
          <EmptyState
            title="No trending items available"
            description="Trending content is currently refreshing. Please check back shortly."
          />
        )}

        {!isInitialLoading && currentItems.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>

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
                    <span className="font-medium">Loading more trending items...</span>
                  </div>
                ) : hasMore ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                    <span>Scroll down for continuous infinite news...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border border-border/50">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>You&apos;re all caught up with trending topics!</span>
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
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
