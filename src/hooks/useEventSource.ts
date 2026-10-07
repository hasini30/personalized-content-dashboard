import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentItem } from '@/types/content';

export interface UseEventSourceOptions {
  url?: string;
  enabled?: boolean;
  onNewItem?: (item: ContentItem) => void;
  onArticleUpdated?: (item: ContentItem) => void;
}

export function useEventSource({
  url = '/api/stream',
  enabled = true,
  onNewItem,
  onArticleUpdated,
}: UseEventSourceOptions = {}) {
  const [newItems, setNewItems] = useState<ContentItem[]>([]);
  const [updatedItems, setUpdatedItems] = useState<ContentItem[]>([]);
  const [latestUpdatedItem, setLatestUpdatedItem] = useState<ContentItem | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Keep callback refs fresh
  const onNewItemRef = useRef(onNewItem);
  onNewItemRef.current = onNewItem;
  const onArticleUpdatedRef = useRef(onArticleUpdated);
  onArticleUpdatedRef.current = onArticleUpdated;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
    });

    const handleNewItem = (event: MessageEvent) => {
      try {
        const item: ContentItem = JSON.parse(event.data);
        setNewItems((prev) => {
          // Avoid duplicate items in buffer
          if (
            prev.some((p) => p.id === item.id || (p.url && p.url === item.url && p.url !== '#'))
          ) {
            return prev.map((p) =>
              p.id === item.id || (p.url && p.url === item.url && p.url !== '#') ? item : p
            );
          }
          return [item, ...prev];
        });
        if (onNewItemRef.current) {
          onNewItemRef.current(item);
        }
      } catch (err) {
        console.error('Failed to parse SSE new_item payload:', err);
      }
    };

    const handleArticleUpdated = (event: MessageEvent) => {
      try {
        const item: ContentItem = JSON.parse(event.data);
        const updatedWithBadge = {
          ...item,
          isUpdated: true,
          updatedAt: item.updatedAt || new Date().toISOString(),
        };

        // If item exists in newItems buffer, update it in place
        setNewItems((prev) =>
          prev.map((p) =>
            p.id === updatedWithBadge.id ||
            (p.url && p.url === updatedWithBadge.url && p.url !== '#')
              ? updatedWithBadge
              : p
          )
        );

        setUpdatedItems((prev) => {
          const filtered = prev.filter(
            (p) =>
              p.id !== updatedWithBadge.id &&
              (!p.url || p.url === '#' || p.url !== updatedWithBadge.url)
          );
          return [updatedWithBadge, ...filtered];
        });

        setLatestUpdatedItem(updatedWithBadge);

        if (onArticleUpdatedRef.current) {
          onArticleUpdatedRef.current(updatedWithBadge);
        }
      } catch (err) {
        console.error('Failed to parse SSE article_updated payload:', err);
      }
    };

    eventSource.addEventListener('new_item', handleNewItem);
    eventSource.addEventListener('article_updated', handleArticleUpdated);
    eventSource.addEventListener('update_item', handleArticleUpdated);

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.removeEventListener('new_item', handleNewItem);
      eventSource.removeEventListener('article_updated', handleArticleUpdated);
      eventSource.removeEventListener('update_item', handleArticleUpdated);
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [url, enabled]);

  const mergeNewItems = useCallback((): ContentItem[] => {
    const itemsToMerge = [...newItems];
    setNewItems([]);
    return itemsToMerge;
  }, [newItems]);

  const clearNewItems = useCallback(() => {
    setNewItems([]);
  }, []);

  const clearUpdatedItems = useCallback(() => {
    setUpdatedItems([]);
    setLatestUpdatedItem(null);
  }, []);

  return {
    newItems,
    updatedItems,
    latestUpdatedItem,
    unreadCount: newItems.length,
    isConnected,
    mergeNewItems,
    clearNewItems,
    clearUpdatedItems,
  };
}
