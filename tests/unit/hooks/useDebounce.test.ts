import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 400));
    expect(result.current).toBe('hello');
  });

  it('updates value only after specified delay', () => {
    const { result, rerender } = renderHook(({ val, delay }) => useDebounce(val, delay), {
      initialProps: { val: 'initial', delay: 400 },
    });

    expect(result.current).toBe('initial');

    rerender({ val: 'updated', delay: 400 });
    // Still old value before timer expires
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  it('cancels pending update if value changes quickly', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
      initialProps: { val: 'first' },
    });

    rerender({ val: 'second' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ val: 'third' });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // Has not reached 400ms for 'third' yet
    expect(result.current).toBe('first');

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('third');
  });
});
