/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getNews } from '@/app/api/news/route';
import { GET as getTrending } from '@/app/api/trending/route';
import { GET as getSearch } from '@/app/api/search/route';

describe('Content Access Rules and Translation API Tests', () => {
  describe('/api/news', () => {
    it('omitting category returns all news without limiting access', async () => {
      const req = new NextRequest('http://localhost:3000/api/news?page=1&pageSize=10');
      const res = await getNews(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      const categories = new Set(data.items.map((i: { category: string }) => i.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('ranks preferred categories first in "preferred" scope, followed by other topics', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/news?page=1&pageSize=10&scope=preferred&preferredCategories=technology'
      );
      const res = await getNews(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);

      // The first item should be from the preferred category
      expect(data.items[0].category.toLowerCase()).toBe('technology');
      expect(data.items[0].isPreferred).toBe(true);

      // Subsequent items should include other topics (never a dead end)
      const otherCategoryItems = data.items.filter(
        (i: { category: string }) => i.category.toLowerCase() !== 'technology'
      );
      expect(otherCategoryItems.length).toBeGreaterThan(0);
    });

    it('returns unweighted mixed categories in "all" scope', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/news?page=1&pageSize=10&scope=all&preferredCategories=technology'
      );
      const res = await getNews(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
    });

    it('allows reaching ANY category at any time via category parameter', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/news?category=sports&preferredCategories=technology'
      );
      const res = await getNews(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      data.items.forEach((item: { category: string }) => {
        expect(item.category.toLowerCase()).toBe('sports');
      });
    });

    it('translates news content server-side when requested in Hindi or Telugu', async () => {
      const reqHindi = new NextRequest('http://localhost:3000/api/news?page=1&pageSize=2&lang=hi');
      const resHindi = await getNews(reqHindi);
      expect(resHindi.status).toBe(200);

      const dataHindi = await resHindi.json();
      expect(dataHindi.items.length).toBeGreaterThan(0);
      expect(dataHindi.items[0].isTranslated).toBe(true);
      expect(dataHindi.items[0].language).toBe('hi');
      expect(dataHindi.items[0].originalTitle).toBeDefined();

      const reqTelugu = new NextRequest('http://localhost:3000/api/news?page=1&pageSize=2&lang=te');
      const resTelugu = await getNews(reqTelugu);
      expect(resTelugu.status).toBe(200);

      const dataTelugu = await resTelugu.json();
      expect(dataTelugu.items.length).toBeGreaterThan(0);
      expect(dataTelugu.items[0].isTranslated).toBe(true);
      expect(dataTelugu.items[0].language).toBe('te');
      expect(dataTelugu.items[0].originalTitle).toBeDefined();
    });

    it('rejects unsupported non-Indian language with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/news?lang=fr');
      const res = await getNews(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('/api/trending', () => {
    it('returns top headlines across all categories with badges for preferred topics', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/trending?page=1&pageSize=10&preferredCategories=technology'
      );
      const res = await getTrending(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);

      const preferredItems = data.items.filter((i: { isPreferred?: boolean }) => i.isPreferred);
      const nonPreferredItems = data.items.filter((i: { isPreferred?: boolean }) => !i.isPreferred);

      expect(preferredItems.length).toBeGreaterThan(0);
      expect(nonPreferredItems.length).toBeGreaterThan(0);
    });
  });

  describe('/api/search', () => {
    it('searches across all content ignoring user preferences', async () => {
      const req = new NextRequest('http://localhost:3000/api/search?q=chips');
      const res = await getSearch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].title).toContain('Next-Gen AI Hardware Accelerators');
    });

    it('supports optional category filter on search', async () => {
      const req = new NextRequest('http://localhost:3000/api/search?q=chips&category=technology');
      const res = await getSearch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].category.toLowerCase()).toBe('technology');
    });
  });
});
