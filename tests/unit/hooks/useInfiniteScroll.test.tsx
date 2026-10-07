import React from 'react';
import { render, act } from '@testing-library/react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  elements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  trigger(isIntersecting: boolean) {
    const entries = Array.from(this.elements).map((target) => ({
      isIntersecting,
      target,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    })) as IntersectionObserverEntry[];

    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function TestSentinelComponent({
  onLoadMore,
  hasMore,
  isLoading,
  cooldownMs,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  cooldownMs?: number;
}) {
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    cooldownMs,
  });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe('useInfiniteScroll hook', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    jest.useFakeTimers();
  });

  afterEach(() => {
    delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    jest.useRealTimers();
  });

  it('observes element and triggers onLoadMore when intersecting and hasMore is true', () => {
    const onLoadMore = jest.fn();
    render(
      <TestSentinelComponent
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={false}
        cooldownMs={500}
      />
    );

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();

    act(() => {
      observer.trigger(true);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('throttles rapid consecutive triggers using cooldownMs', () => {
    const onLoadMore = jest.fn();
    render(
      <TestSentinelComponent
        onLoadMore={onLoadMore}
        hasMore={true}
        isLoading={false}
        cooldownMs={500}
      />
    );

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();

    act(() => {
      observer.trigger(true);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Immediate second trigger within cooldown window should be suppressed
    act(() => {
      observer.trigger(true);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Advance time past cooldownMs
    act(() => {
      jest.advanceTimersByTime(550);
    });

    act(() => {
      observer.trigger(true);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('does not trigger onLoadMore when isLoading is true or hasMore is false', () => {
    const onLoadMore = jest.fn();
    const { rerender } = render(
      <TestSentinelComponent onLoadMore={onLoadMore} hasMore={true} isLoading={true} />
    );

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();

    act(() => {
      observer.trigger(true);
    });
    expect(onLoadMore).not.toHaveBeenCalled();

    // Now hasMore is false
    rerender(<TestSentinelComponent onLoadMore={onLoadMore} hasMore={false} isLoading={false} />);
    act(() => {
      observer.trigger(true);
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
