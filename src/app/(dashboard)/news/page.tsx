'use client';

import * as React from 'react';
import { Newspaper, Sparkles, RefreshCw, Filter, Search, ArrowUpDown } from 'lucide-react';
import { useGetNewsQuery } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import { ContentCard } from '@/components/cards/ContentCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Pagination } from '@/components/ui/Pagination';
import { AppLayout } from '@/components/layout/AppLayout';
import { deduplicateContentItems } from '@/lib/feedUtils';
import { useEventSource } from '@/hooks/useEventSource';
import { ContentItem } from '@/types/content';

const ALL_CATEGORY_CHIPS = [
  'all',
  'general',
  'business',
  'entertainment',
  'health',
  'science',
  'sports',
  'technology',
  'politics',
  'world',
  'environment',
  'education',
] as const;

const TRUSTED_PUBLISHERS = [
  'all',
  'BBC News',
  'Reuters',
  'The Hindu',
  'Times of India',
  'TechCrunch',
  'The Guardian',
] as const;

function matchesCategory(itemCategory: string, selectedCategory: string): boolean {
  if (!selectedCategory || selectedCategory === 'all') return true;
  const target = selectedCategory.toLowerCase().trim();
  const cat = (itemCategory || '').toLowerCase().trim();
  if (cat === target) return true;

  if (target === 'sports') {
    return ['sport', 'sports', 'cricket', 'football', 'tennis', 'nfl', 'soccer', 'athletics', 'racing', 'cycling'].some((k) => cat.includes(k));
  }
  if (target === 'technology') {
    return ['tech', 'technology', 'gadget', 'gadgets', 'ai', 'software', 'hardware', 'smartphone', 'apple', 'google'].some((k) => cat.includes(k));
  }
  if (target === 'business') {
    return ['business', 'market', 'markets', 'economy', 'finance', 'banking', 'stocks', 'industry'].some((k) => cat.includes(k));
  }
  if (target === 'entertainment') {
    return ['entertainment', 'culture', 'movie', 'movies', 'film', 'cinema', 'music', 'tv', 'television', 'arts', 'games', 'celebrity'].some((k) => cat.includes(k));
  }
  if (target === 'science') {
    return ['science', 'sci-tech', 'space', 'physics', 'biology', 'astronomy', 'research', 'glacier'].some((k) => cat.includes(k));
  }
  if (target === 'health') {
    return ['health', 'medical', 'medicine', 'wellness', 'hospital', 'disease'].some((k) => cat.includes(k));
  }
  if (target === 'environment') {
    return ['environment', 'climate', 'wildlife', 'ecology', 'nature', 'conservation'].some((k) => cat.includes(k));
  }
  if (target === 'education') {
    return ['education', 'school', 'university', 'college', 'students', 'learning'].some((k) => cat.includes(k));
  }
  if (target === 'politics') {
    return ['politics', 'national', 'government', 'election', 'policy', 'parliament', 'senate'].some((k) => cat.includes(k));
  }
  if (target === 'world') {
    return ['world', 'international', 'global'].some((k) => cat.includes(k));
  }

  return cat.includes(target) || target.includes(cat);
}

function matchesPublisher(item: ContentItem, selectedPublisher: string): boolean {
  if (!selectedPublisher || selectedPublisher === 'all') return true;
  const target = selectedPublisher.toLowerCase().trim();
  const author = (item.author || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const url = (item.url || '').toLowerCase();
  const hashtags = (item.hashtags || []).join(' ').toLowerCase();

  if (target === 'bbc news' || target === 'bbc') {
    return author.includes('bbc') || url.includes('bbc') || hashtags.includes('bbc');
  }
  if (target === 'reuters') {
    return author.includes('reuters') || url.includes('reuters') || hashtags.includes('reuters');
  }
  if (target === 'the hindu') {
    return author.includes('hindu') || url.includes('thehindu') || hashtags.includes('hindu');
  }
  if (target === 'times of india') {
    return (
      author.includes('times of india') ||
      author.includes('toi') ||
      url.includes('indiatimes') ||
      url.includes('timesofindia') ||
      hashtags.includes('timesofindia')
    );
  }
  if (target === 'techcrunch') {
    return author.includes('techcrunch') || url.includes('techcrunch') || hashtags.includes('techcrunch');
  }
  if (target === 'the guardian') {
    return author.includes('guardian') || url.includes('theguardian') || hashtags.includes('guardian');
  }

  return author.includes(target) || target.includes(author) || title.includes(target) || url.includes(target);
}

export default function NewsPage() {
  const preferences = useAppSelector((state) => state.preferences);
  const preferredCategories = preferences.categories.map((c) => c.toLowerCase());
  const contentLanguage = preferences.contentLanguage || 'en';

  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedPublisher, setSelectedPublisher] = React.useState<string>('all');
  const [selectedSort, setSelectedSort] = React.useState<'newest' | 'oldest' | 'title'>('newest');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [displayMode, setDisplayMode] = React.useState<'infinite' | 'paginated'>('infinite');

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Live real-time stream subscription for configured news sources
  const streamUrl = `/api/stream?lang=${encodeURIComponent(contentLanguage || 'en')}`;
  const { newItems, updatedItems, isConnected } = useEventSource({
    url: streamUrl,
    enabled: true,
  });

  const [liveNewArticles, setLiveNewArticles] = React.useState<ContentItem[]>([]);
  const [updatedArticlesMap, setUpdatedArticlesMap] = React.useState<Record<string, ContentItem>>(
    {}
  );

  // When newly published articles arrive from configured sources, automatically reflect them
  React.useEffect(() => {
    if (newItems && newItems.length > 0) {
      const newsOnly = newItems.filter((i) => i.source === 'news');
      if (newsOnly.length > 0) {
        setLiveNewArticles((prev) => deduplicateContentItems([...newsOnly, ...prev]));
      }
    }
  }, [newItems]);

  // When existing articles are updated by configured sources, automatically update them in place
  React.useEffect(() => {
    if (updatedItems && updatedItems.length > 0) {
      setUpdatedArticlesMap((prev) => {
        const next = { ...prev };
        for (const item of updatedItems) {
          next[item.id] = item;
          if (item.url && item.url !== '#') {
            next[item.url] = item;
          }
        }
        return next;
      });

      // Also update in liveNewArticles in place
      setLiveNewArticles((prev) =>
        prev.map((item) => {
          const match = updatedItems.find(
            (u) => u.id === item.id || (u.url && u.url !== '#' && u.url === item.url)
          );
          return match ? { ...item, ...match, isUpdated: true } : item;
        })
      );
    }
  }, [updatedItems]);

  // Clear live news when content language changes
  const prevLang = React.useRef(contentLanguage);
  React.useEffect(() => {
    if (prevLang.current !== contentLanguage) {
      prevLang.current = contentLanguage;
      setLiveNewArticles([]);
      setUpdatedArticlesMap({});
    }
  }, [contentLanguage]);

  const {
    data: newsData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetNewsQuery({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    sources: selectedPublisher !== 'all' ? selectedPublisher : undefined,
    q: debouncedSearch || undefined,
    page,
    pageSize,
    scope: 'all', // News page allows unrestricted browsing across all categories
    lang: contentLanguage,
    preferredCategories: preferredCategories.join(','),
  });

  // Reset pagination on filter, publisher, search, language, or sort change
  React.useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedPublisher, debouncedSearch, contentLanguage, selectedSort]);

  const items = React.useMemo(() => {
    let combined = deduplicateContentItems([...liveNewArticles, ...(newsData?.items || [])]);

    if (Object.keys(updatedArticlesMap).length > 0) {
      combined = combined.map((item) => {
        const match =
          updatedArticlesMap[item.id] ||
          (item.url && item.url !== '#' ? updatedArticlesMap[item.url] : undefined);
        return match ? { ...item, ...match, isUpdated: true } : item;
      });
    }

    if (selectedCategory !== 'all') {
      combined = combined.filter((i) => matchesCategory(i.category, selectedCategory));
    }

    if (selectedPublisher !== 'all') {
      combined = combined.filter((i) => matchesPublisher(i, selectedPublisher));
    }

    if (selectedSort === 'newest') {
      combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } else if (selectedSort === 'oldest') {
      combined.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    } else if (selectedSort === 'title') {
      combined.sort((a, b) => a.title.localeCompare(b.title));
    }

    return combined;
  }, [liveNewArticles, newsData?.items, selectedCategory, selectedPublisher, selectedSort, updatedArticlesMap]);

  const hasMore = Boolean(newsData?.hasMore);
  const isInitialLoading = page === 1 && isLoading;
  const isFetchingMore = page > 1 && isFetching;
  const hasInitialError = isError && items.length === 0;

  // Windowed items when in paginated mode
  const displayedItems = React.useMemo(() => {
    if (displayMode === 'infinite') return items;
    const start = Math.max(0, (page - 1) * pageSize);
    if (items.length > start) {
      return items.slice(start, start + pageSize);
    }
    return items.slice(0, pageSize);
  }, [items, displayMode, page, pageSize]);

  const handleLoadMore = React.useCallback(() => {
    if (hasMore && !isFetchingMore && !isError) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetchingMore, isError]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore: hasMore && displayMode === 'infinite',
    isLoading: isFetchingMore || isInitialLoading || displayMode === 'paginated',
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              <span>Global News Explorer</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse verified journalism across all categories. Select any category to view full
              coverage regardless of feed preferences.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Live Auto-Detection Status Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-xs">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="font-medium text-foreground">
                {isConnected ? 'Auto-Sync Active' : 'Connecting...'}
              </span>
            </div>

            {/* Display Mode Switch */}
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

            {/* Sort Order Selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/50 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                id="news-sort-select"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as 'newest' | 'oldest' | 'title')}
                className="bg-transparent border-none text-xs font-medium text-foreground focus:outline-none cursor-pointer pr-1"
                aria-label="Sort news stories"
              >
                <option value="newest" className="bg-card text-foreground">
                  Newest First
                </option>
                <option value="oldest" className="bg-card text-foreground">
                  Oldest First
                </option>
                <option value="title" className="bg-card text-foreground">
                  Headline (A–Z)
                </option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all global news by topic, headline, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Categories:</span>
          </span>

          {ALL_CATEGORY_CHIPS.map((cat) => {
            const isSelected = selectedCategory === cat;
            const isPreferred = cat !== 'all' && preferredCategories.includes(cat);

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {isPreferred && (
                  <span
                    className="text-amber-400 font-bold"
                    title="Preferred topic in your settings"
                  >
                    ★
                  </span>
                )}
                <span className="capitalize">{cat === 'all' ? 'All News' : cat}</span>
              </button>
            );
          })}
        </div>

        {/* Publisher / Source Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap mr-1">
            <Newspaper className="h-3.5 w-3.5" />
            <span>Publishers:</span>
          </span>

          {TRUSTED_PUBLISHERS.map((pub) => {
            const isSelected = selectedPublisher === pub;
            return (
              <button
                key={pub}
                onClick={() => setSelectedPublisher(pub)}
                className={`px-3 py-1 text-xs rounded-full border transition-all whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? 'bg-secondary text-secondary-foreground border-primary/60 font-semibold shadow-sm ring-1 ring-primary/40'
                    : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>{pub === 'all' ? 'All Publishers' : pub}</span>
              </button>
            );
          })}
        </div>

        {/* News Grid */}
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

        {hasInitialError && (
          <ErrorState
            title="Could not load news"
            message="An error occurred while loading news stories. Please try again."
            onRetry={() => {
              setPage(1);
              refetch();
            }}
          />
        )}

        {!isInitialLoading && !hasInitialError && items.length === 0 && (
          <EmptyState
            title="No news found"
            description={
              debouncedSearch
                ? `No news matching "${debouncedSearch}" in the selected category.`
                : selectedPublisher !== 'all'
                ? `No news stories from ${selectedPublisher} found in this category.`
                : 'No news stories are currently available for this category.'
            }
            actionLabel="Show All News"
            onAction={() => {
              setSelectedCategory('all');
              setSelectedPublisher('all');
              setSearchQuery('');
            }}
          />
        )}

        {!isInitialLoading && !hasInitialError && items.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>

            {/* Inline Retry if subsequent fetch fails */}
            {isError && items.length > 0 && (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-destructive font-medium">
                  Could not load additional stories. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Loading More</span>
                </Button>
              </div>
            )}

            {/* Infinite Scroll Sentinel or Pagination Controls */}
            {displayMode === 'infinite' ? (
              !isError && (
                <div
                  ref={sentinelRef}
                  className="py-8 my-4 flex flex-col items-center justify-center min-h-[96px] w-full"
                  aria-live="polite"
                >
                  {isFetchingMore ? (
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-card border border-border shadow-sm text-sm text-foreground animate-in fade-in">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="font-medium">Loading more stories...</span>
                    </div>
                  ) : hasMore ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                      <span>Scroll down for continuous infinite news...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border border-border/50">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>You&apos;re all caught up with the latest news!</span>
                    </div>
                  )}
                </div>
              )
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
                  totalItems={newsData?.total}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
