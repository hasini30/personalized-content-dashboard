'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { UnifiedFeed } from '@/components/feed/UnifiedFeed';
import { useEventSource } from '@/hooks/useEventSource';
import { useAppSelector } from '@/store/hooks';
import { selectContentLanguage } from '@/features/preferences/preferencesSlice';
import { useTranslation } from 'react-i18next';
import { ContentItem } from '@/types/content';

export default function HomePage() {
  const { t } = useTranslation();
  const contentLanguage = useAppSelector(selectContentLanguage);
  const streamUrl = `/api/stream?lang=${encodeURIComponent(contentLanguage || 'en')}`;

  const {
    newItems,
    updatedItems,
    latestUpdatedItem,
    unreadCount,
    mergeNewItems,
    clearNewItems,
    isConnected,
  } = useEventSource({
    url: streamUrl,
    enabled: true,
  });

  const [headerAppliedItems, setHeaderAppliedItems] = React.useState<ContentItem[]>([]);

  const handleApplyLiveUpdates = () => {
    const merged = mergeNewItems();
    if (merged.length > 0) {
      setHeaderAppliedItems(merged);
    }
  };

  return (
    <AppLayout liveUpdatesCount={unreadCount} onApplyLiveUpdates={handleApplyLiveUpdates}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('feed.title') || 'My Unified Feed'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('feed.subtitle') ||
              'Real-time personalized news, trending movies, and social posts tailored to your preferences.'}
          </p>
        </div>

        <UnifiedFeed
          incomingLiveItems={newItems}
          incomingUpdatedItems={updatedItems}
          latestUpdatedItem={latestUpdatedItem}
          externalAppliedItems={headerAppliedItems}
          onClearLiveItems={clearNewItems}
          isLiveConnected={isConnected}
        />
      </div>
    </AppLayout>
  );
}
