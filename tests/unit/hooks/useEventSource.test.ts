import { renderHook, act } from '@testing-library/react';
import { useEventSource } from '@/hooks/useEventSource';
import { ContentItem } from '@/types/content';

type StreamEvent = Event | MessageEvent | { data: string };

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, ((event: StreamEvent) => void)[]> = {};
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: StreamEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: StreamEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close() {
    this.readyState = 2;
  }

  // Helper test methods
  triggerOpen() {
    if (this.onopen) this.onopen();
    if (this.listeners['connected']) {
      this.listeners['connected'].forEach((l) => l(new Event('connected')));
    }
  }

  triggerMessage(item: ContentItem) {
    if (this.listeners['new_item']) {
      const event = { data: JSON.stringify(item) };
      this.listeners['new_item'].forEach((l) => l(event));
    }
  }

  triggerArticleUpdated(item: ContentItem) {
    if (this.listeners['article_updated']) {
      const event = { data: JSON.stringify(item) };
      this.listeners['article_updated'].forEach((l) => l(event));
    }
  }

  triggerError() {
    if (this.onerror) this.onerror();
  }
}

describe('useEventSource hook', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource?: unknown }).EventSource =
      MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    delete (globalThis as unknown as { EventSource?: unknown }).EventSource;
  });

  it('connects to event source and updates connection status', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(result.current.isConnected).toBe(false);

    act(() => {
      MockEventSource.instances[0].triggerOpen();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('receives stream items, deduplicates, and provides merge/clear actions', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));

    const item1: ContentItem = {
      id: 'stream-1',
      source: 'news',
      title: 'Live News',
      publishedAt: '2026-03-01T00:00:00Z',
    };

    act(() => {
      MockEventSource.instances[0].triggerMessage(item1);
      // Trigger duplicate
      MockEventSource.instances[0].triggerMessage(item1);
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.newItems).toHaveLength(1);

    let merged: ContentItem[] = [];
    act(() => {
      merged = result.current.mergeNewItems();
    });

    expect(merged).toHaveLength(1);
    expect(result.current.unreadCount).toBe(0);
  });

  it('handles article_updated event and updates buffer items in place', () => {
    const onArticleUpdated = jest.fn();
    const { result } = renderHook(() => useEventSource({ url: '/api/stream', onArticleUpdated }));

    const initialItem: ContentItem = {
      id: 'stream-100',
      source: 'news',
      title: 'Original Breaking Headline',
      publishedAt: '2026-03-01T00:00:00Z',
    };

    act(() => {
      MockEventSource.instances[0].triggerMessage(initialItem);
    });

    expect(result.current.newItems[0].title).toBe('Original Breaking Headline');

    const updatedItem: ContentItem = {
      id: 'stream-100',
      source: 'news',
      title: 'UPDATED: Fully Verified Breaking Headline',
      publishedAt: '2026-03-01T00:00:00Z',
      isUpdated: true,
    };

    act(() => {
      MockEventSource.instances[0].triggerArticleUpdated(updatedItem);
    });

    expect(result.current.newItems[0].title).toBe('UPDATED: Fully Verified Breaking Headline');
    expect(result.current.newItems[0].isUpdated).toBe(true);
    expect(result.current.updatedItems).toHaveLength(1);
    expect(result.current.latestUpdatedItem?.title).toBe(
      'UPDATED: Fully Verified Breaking Headline'
    );
    expect(onArticleUpdated).toHaveBeenCalledTimes(1);
  });

  it('handles disconnect and cleanup on unmount', () => {
    const { unmount } = renderHook(() => useEventSource({ url: '/api/stream' }));
    const instance = MockEventSource.instances[0];

    unmount();
    expect(instance.readyState).toBe(2);
  });
});
