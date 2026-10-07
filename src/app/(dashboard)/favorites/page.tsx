'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ContentCard } from '@/components/cards/ContentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearFavorites } from '@/features/favorites/favoritesSlice';
import { Heart, Trash2, Search, Filter, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { semanticSearchFilter } from '@/lib/semanticSearch';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const favorites = useAppSelector((state) => state.favorites.items);
  const [filterSource, setFilterSource] = React.useState<'all' | 'news' | 'movie' | 'social'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isClearModalOpen, setIsClearModalOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [displayMode, setDisplayMode] = React.useState<'infinite' | 'paginated'>('paginated');

  const filteredItems = React.useMemo(() => {
    let list = favorites;
    if (filterSource !== 'all') {
      list = list.filter((item) => item.source === filterSource);
    }
    if (!searchQuery.trim()) {
      return list;
    }
    return semanticSearchFilter(list, searchQuery);
  }, [favorites, filterSource, searchQuery]);

  // Reset page when search or filter changes
  React.useEffect(() => {
    setPage(1);
  }, [filterSource, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const hasMore = displayMode === 'infinite' && page < totalPages;

  const displayedItems = React.useMemo(() => {
    if (displayMode === 'infinite') {
      return filteredItems.slice(0, page * pageSize);
    }
    const start = Math.max(0, (page - 1) * pageSize);
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, displayMode, page, pageSize]);

  const handleLoadMore = React.useCallback(() => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: false,
  });

  const handleConfirmClear = () => {
    dispatch(clearFavorites());
    fetch('/api/user/favorites?clearAll=true', { method: 'DELETE' }).catch(() => {});
    setIsClearModalOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('favorites.title') || 'My Saved Favorites'}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('favorites.subtitle') ||
                'Your saved articles, movies, and posts. Persisted locally and in SQLite for full offline access.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Display Mode: Infinite vs Pages */}
            {filteredItems.length > pageSize && (
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
            )}

            {favorites.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsClearModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t('favorites.clearAll') || 'Clear All'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        {favorites.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('favorites.filterPlaceholder') || 'Filter saved items...'}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium self-start sm:self-auto overflow-x-auto max-w-full">
              {[
                { id: 'all', label: t('favorites.allSaved') || 'All Saved' },
                { id: 'news', label: t('feed.news') || 'News' },
                { id: 'movie', label: t('feed.movies') || 'Movies' },
                { id: 'social', label: t('feed.social') || 'Social' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterSource(f.id as 'all' | 'news' | 'movie' | 'social')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    filterSource === f.id
                      ? 'bg-card text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Display */}
        {favorites.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-8 w-8 text-rose-500" />}
            title={t('favorites.emptyTitle') || 'No favorites saved yet'}
            description={
              t('favorites.emptyDesc') ||
              'Whenever you see a story, movie, or post you like, click the heart icon on its card to save it here for offline reading.'
            }
            actionLabel={t('favorites.exploreFeed') || 'Explore Feed'}
            onAction={() => {
              window.location.href = '/';
            }}
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Filter className="h-8 w-8 text-muted-foreground" />}
            title={t('feed.noResults') || 'No matching favorites'}
            description={`No saved items match your filter criteria.`}
            actionLabel={t('feed.resetFilters') || 'Reset Filter'}
            onAction={() => {
              setFilterSource('all');
              setSearchQuery('');
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination Controls or Infinite Scroll Sentinel */}
            {displayMode === 'infinite' ? (
              <div ref={sentinelRef} className="py-6 flex justify-center">
                {!hasMore && filteredItems.length > pageSize && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border border-border/50">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>All {filteredItems.length} saved favorites shown.</span>
                  </div>
                )}
              </div>
            ) : (
              totalPages > 1 && (
                <div className="pt-4 border-t border-border/60">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => {
                      setPage(newPage);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    pageSize={pageSize}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setPage(1);
                    }}
                    totalItems={filteredItems.length}
                  />
                </div>
              )
            )}
          </>
        )}

        {/* Clear Confirmation Modal */}
        <Modal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          title={t('favorites.confirmTitle') || 'Clear All Favorites?'}
          description={
            t('favorites.confirmDesc') ||
            'This action cannot be undone. All saved stories and recommendations will be permanently removed from your device storage.'
          }
        >
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsClearModalOpen(false)}>
              {t('favorites.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmClear}>
              {t('favorites.confirmBtn') || 'Yes, Clear All'}
            </Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
