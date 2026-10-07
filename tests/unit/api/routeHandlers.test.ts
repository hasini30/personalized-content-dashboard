/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getNews } from '@/app/api/news/route';
import { GET as getMovies } from '@/app/api/movies/route';
import { GET as getSocial } from '@/app/api/social/route';
import { GET as getStream } from '@/app/api/stream/route';

describe('Route Handlers API Proxy and Mock Fallbacks', () => {
  describe('/api/news', () => {
    it('returns paginated news with mock fallback when no API key is set', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/news?page=1&pageSize=2&category=technology'
      );
      const res = await getNews(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(2);
      expect(data.items.length).toBeLessThanOrEqual(2);
      expect(data.isDemo).toBe(true);
      expect(data.items[0].source).toBe('news');
      expect(data.items[0].category).toBe('technology');
      expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
    });

    it('returns 400 for invalid page number', async () => {
      const req = new NextRequest('http://localhost:3000/api/news?page=-1');
      const res = await getNews(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid query parameters');
    });

    it('enforces rate limit and returns 429 when client exceeds request quota', async () => {
      const spamIp = '198.51.100.42';
      // Fire requests up to quota limit (60)
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest('http://localhost:3000/api/news', {
          headers: { 'x-forwarded-for': spamIp },
        });
        await getNews(req);
      }

      // 61st request should be throttled with 429
      const throttledReq = new NextRequest('http://localhost:3000/api/news', {
        headers: { 'x-forwarded-for': spamIp },
      });
      const throttledRes = await getNews(throttledReq);
      expect(throttledRes.status).toBe(429);
      expect(throttledRes.headers.get('retry-after')).toBeDefined();
      const body = await throttledRes.json();
      expect(body.error).toBe('Too Many Requests');
    });

    it('semantically filters news articles by conceptual meaning rather than strict keywords', async () => {
      // Query "chips" should semantically match the AI Hardware Accelerators article
      const req = new NextRequest('http://localhost:3000/api/news?q=chips');
      const res = await getNews(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].title).toContain('Next-Gen AI Hardware Accelerators');
    });
  });

  describe('/api/movies', () => {
    it('returns paginated movies with mock fallback', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/movies?page=1&pageSize=3&trending=true'
      );
      const res = await getMovies(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(3);
      expect(data.items.length).toBeLessThanOrEqual(3);
      expect(data.isDemo).toBe(true);
      expect(data.items[0].source).toBe('movie');
      expect(data.items[0].imageUrl).toMatch(/^https:\/\/image\.tmdb\.org/);
    });

    it('filters movies by query keyword', async () => {
      const req = new NextRequest('http://localhost:3000/api/movies?q=Dune');
      const res = await getMovies(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].title.toLowerCase()).toContain('dune');
    });
  });

  describe('/api/social', () => {
    it('returns social posts with hashtag filtering', async () => {
      const req = new NextRequest('http://localhost:3000/api/social?hashtag=ai');
      const res = await getSocial(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].source).toBe('social');
      expect(data.items[0].hashtags).toContain('ai');
    });
  });

  describe('/api/stream', () => {
    it('returns a readable stream with text/event-stream headers', async () => {
      const abortController = new AbortController();
      const req = new NextRequest('http://localhost:3000/api/stream', {
        signal: abortController.signal,
      });
      const res = await getStream(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/event-stream');
      abortController.abort();
    });
  });
});
