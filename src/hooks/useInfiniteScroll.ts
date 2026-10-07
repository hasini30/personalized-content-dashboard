import { useCallback, useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  rootMargin?: string;
  cooldownMs?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 0.1,
  rootMargin = '400px',
  cooldownMs = 400,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  // Keep latest callbacks and state in mutable refs so listeners/observers do not unbind needlessly
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const lastTriggerTimeRef = useRef(0);

  const triggerLoadMore = useCallback(() => {
    const now = Date.now();
    if (!hasMoreRef.current || isLoadingRef.current) return;
    if (now - lastTriggerTimeRef.current < cooldownMs) return;
    lastTriggerTimeRef.current = now;
    onLoadMoreRef.current();
  }, [cooldownMs]);

  const cleanupObserver = () => {
    if (observerRef.current) {
      if (elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  };

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      cleanupObserver();
      elementRef.current = node;

      if (!node || typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver(
        (entries) => {
          const [target] = entries;
          if (target.isIntersecting) {
            triggerLoadMore();
          }
        },
        {
          root: null,
          rootMargin,
          threshold,
        }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [rootMargin, threshold, triggerLoadMore]
  );

  // Window scroll & resize listener fallback:
  // Guarantees that scrolling near the bottom always triggers, even if the observer misses an event
  // or if the sentinel was already inside the viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;
    const handleScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!hasMoreRef.current || isLoadingRef.current) return;

        // Check if sentinel is near viewport
        if (elementRef.current) {
          const rect = elementRef.current.getBoundingClientRect();
          if (rect.top <= window.innerHeight + 500) {
            triggerLoadMore();
            return;
          }
        }

        // Generic page-bottom calculation fallback
        const scrollBottom = window.innerHeight + window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        if (docHeight - scrollBottom <= 600) {
          triggerLoadMore();
        }
      });
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      cleanupObserver();
    };
  }, [triggerLoadMore]);

  // When isLoading transitions from true to false, re-check whether we're still at the bottom
  // This solves the stuck sentinel bug where new items didn't push the sentinel far enough
  const prevLoadingRef = useRef(isLoading);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;

    if (wasLoading && !isLoading && hasMore) {
      if (typeof window === 'undefined') return;
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 300) {
          triggerLoadMore();
        }
      }
    }
  }, [isLoading, hasMore, triggerLoadMore]);

  return { sentinelRef };
}
