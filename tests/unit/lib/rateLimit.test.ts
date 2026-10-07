import { MemoryRateLimiter } from '@/lib/rateLimit';

describe('MemoryRateLimiter', () => {
  it('allows requests within max limits and decrements remaining quota', () => {
    const limiter = new MemoryRateLimiter({
      intervalMs: 10000,
      maxRequests: 3,
    });

    const res1 = limiter.check('client-1');
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check('client-1');
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check('client-1');
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    // Exceeded
    const res4 = limiter.check('client-1');
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);

    // Another client is unaffected
    const resClient2 = limiter.check('client-2');
    expect(resClient2.success).toBe(true);
    expect(resClient2.remaining).toBe(2);
  });

  it('resets quota when window expires or reset is called', () => {
    const limiter = new MemoryRateLimiter({
      intervalMs: 50,
      maxRequests: 1,
    });

    const res1 = limiter.check('client-1');
    expect(res1.success).toBe(true);

    const res2 = limiter.check('client-1');
    expect(res2.success).toBe(false);

    limiter.reset();

    const res3 = limiter.check('client-1');
    expect(res3.success).toBe(true);
  });
});
