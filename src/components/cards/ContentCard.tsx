'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Heart,
  BookOpen,
  Newspaper,
  Film,
  MessageSquare,
  Sparkles,
  GripVertical,
  Languages,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { ContentItem } from '@/types/content';
import { Badge } from '@/components/ui/Badge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/features/favorites/favoritesSlice';
import { markItemAsRead } from '@/features/feed/feedSlice';
import { ArticleReaderModal } from './ArticleReaderModal';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/dateUtils';
import { isValidExternalUrl } from '@/lib/feedUtils';

export interface ContentCardProps {
  item: ContentItem;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export const ContentCard = React.memo(function ContentCard({
  item,
  dragHandleProps,
  isDragging = false,
}: ContentCardProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector((state) => state.favorites.items.some((f) => f.id === item.id));
  const [imageError, setImageError] = React.useState(false);
  const [isReaderOpen, setIsReaderOpen] = React.useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const willBeFavorite = !isFavorite;
    dispatch(toggleFavorite(item));

    if (willBeFavorite) {
      fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      }).catch(() => {});
    } else {
      fetch(`/api/user/favorites?itemId=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  };

  const getSourceIcon = () => {
    switch (item.source) {
      case 'news':
        return <Newspaper className="h-3.5 w-3.5" />;
      case 'movie':
        return <Film className="h-3.5 w-3.5" />;
      case 'social':
        return <MessageSquare className="h-3.5 w-3.5" />;
      default:
        return <Newspaper className="h-3.5 w-3.5" />;
    }
  };

  const getSourceBadgeVariant = () => {
    switch (item.source) {
      case 'news':
        return 'news';
      case 'movie':
        return 'movie';
      case 'social':
        return 'social';
      default:
        return 'default';
    }
  };

  const getCtaLabel = () => {
    switch (item.source) {
      case 'news':
        return t('card.readSummary') || 'Read Summary';
      case 'movie':
        return t('card.viewDetails') || 'View Details';
      case 'social':
        return t('card.viewPost') || 'View Post';
      default:
        return t('card.readSummary') || 'Read More';
    }
  };

  const dateInfo = React.useMemo(() => {
    return formatRelativeTime(item.publishedAt);
  }, [item.publishedAt]);

  const isRtl = item.language === 'ur';

  return (
    <>
      <article
        tabIndex={0}
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          dispatch(markItemAsRead(item.id));
          if (isValidExternalUrl(item.url, item.isDemo)) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
          } else {
            setIsReaderOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            e.preventDefault();
            dispatch(markItemAsRead(item.id));
            if (isValidExternalUrl(item.url, item.isDemo)) {
              window.open(item.url, '_blank', 'noopener,noreferrer');
            } else {
              setIsReaderOpen(true);
            }
          }
        }}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          isDragging ? 'opacity-50 ring-2 ring-primary scale-[1.02]' : ''
        }`}
      >
        <div>
          {/* Media / Image container */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            {item.imageUrl && !imageError ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
                unoptimized={item.imageUrl.startsWith('https://images.unsplash.com')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-secondary">
                <span className="text-muted-foreground/60">{getSourceIcon()}</span>
              </div>
            )}

            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
              <Badge variant={getSourceBadgeVariant()} className="gap-1 shadow-sm backdrop-blur-md">
                {getSourceIcon()}
                <span className="capitalize">{item.source}</span>
              </Badge>

              {/* Real-time Breaking / Live indicator */}
              {(item.isLive ||
                item.isBreaking ||
                (item.source === 'news' && dateInfo.isRecent)) && (
                <Badge
                  variant="secondary"
                  className="gap-1 shadow-sm backdrop-blur-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                  </span>
                  <span>{item.isLive ? 'LIVE' : 'BREAKING'}</span>
                </Badge>
              )}

              {/* Updated article indicator */}
              {item.isUpdated && (
                <Badge
                  variant="secondary"
                  className="gap-1 shadow-sm backdrop-blur-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {t('card.updated') && t('card.updated') !== 'card.updated'
                      ? t('card.updated')
                      : 'UPDATED'}
                  </span>
                </Badge>
              )}

              {item.isPreferred && (
                <Badge
                  variant="secondary"
                  className="gap-1 shadow-sm backdrop-blur-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold"
                >
                  <span>★ Preferred</span>
                </Badge>
              )}

              {item.isTranslated && (
                <Badge
                  variant="secondary"
                  className="gap-1 shadow-sm backdrop-blur-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                  title="Translated to your selected language"
                >
                  <Languages className="h-3 w-3" />
                  <span>{t('card.translated') || 'Translated'}</span>
                </Badge>
              )}

              {item.source === 'news' && (
                <Badge
                  variant="secondary"
                  className="gap-1 shadow-sm backdrop-blur-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{t('card.easySummary') || 'Easy Summary'}</span>
                </Badge>
              )}

              {item.isDemo && (
                <Badge variant="demo" className="gap-1 shadow-sm backdrop-blur-md">
                  <Sparkles className="h-3 w-3" />
                  <span>{t('card.demo') || 'Demo'}</span>
                </Badge>
              )}
            </div>

            {/* Action Overlay: Favorite & Drag handle */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              {dragHandleProps && (
                <button
                  type="button"
                  aria-label="Drag to reorder"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-md text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...dragHandleProps}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label={
                  isFavorite
                    ? t('card.removeFavorite') || 'Remove from favorites'
                    : t('card.addFavorite') || 'Add to favorites'
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-md text-foreground transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isFavorite
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-muted-foreground hover:text-rose-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span
                className="font-semibold text-foreground/90 truncate max-w-[60%] flex items-center gap-1.5"
                title={item.author || item.category}
              >
                {item.source === 'news' && item.author ? (
                  <span className="text-primary font-bold">{item.author}</span>
                ) : (
                  <span>{item.author || item.category}</span>
                )}
              </span>
              <time
                dateTime={item.publishedAt}
                title={dateInfo.fullDate}
                className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0"
              >
                {dateInfo.isRecent && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
                <span>{dateInfo.display}</span>
              </time>
            </div>

            <h3 className="line-clamp-2 text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-2 flex items-start justify-between gap-1">
              <span>{item.title}</span>
              {isValidExternalUrl(item.url, item.isDemo) && (
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-80 transition-opacity text-primary mt-1" />
              )}
            </h3>

            <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed mb-4">
              {item.isTranslated
                ? item.description || item.simplifiedOverview
                : item.simplifiedOverview || item.description}
            </p>

            {/* Tags */}
            {item.hashtags && item.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.hashtags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium text-primary/80 bg-primary/5 rounded px-1.5 py-0.5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Multi-publisher coverage links */}
            {item.relatedSources &&
              item.relatedSources.filter((rs) => isValidExternalUrl(rs.url)).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span className="font-medium">Also covered by:</span>
                  {item.relatedSources
                    .filter((rs) => isValidExternalUrl(rs.url))
                    .map((rs, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(rs.url, '_blank', 'noopener,noreferrer');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border/60 font-medium"
                        title={`Read coverage on ${rs.name}`}
                      >
                        <span>{rs.name}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </button>
                    ))}
                </div>
              )}
          </div>
        </div>

        {/* Card Footer CTA */}
        <div className="border-t border-border px-4 py-3 sm:px-5 flex items-center justify-between bg-muted/20">
          <span className="text-xs capitalize font-medium text-muted-foreground">
            {item.category}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsReaderOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span>{getCtaLabel()}</span>
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>

      <ArticleReaderModal
        item={item}
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
      />
    </>
  );
});
