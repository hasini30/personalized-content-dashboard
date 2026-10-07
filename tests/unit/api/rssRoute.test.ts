import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/rss/route';
import { initDatabase, closeDatabase } from '@/lib/db/database';
import { clearRssArticles, saveRssArticles, DbRssArticle } from '@/lib/db/rssRepository';
import { stopRssIngestionScheduler } from '@/lib/rss/rssIngestionService';

describe('GET /api/rss Route Handler', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    stopRssIngestionScheduler();
    closeDatabase();
  });

  beforeEach(() => {
    clearRssArticles();
  });

  const testArticles: DbRssArticle[] = [
    {
      id: 'art-1',
      title: 'Major Breakthrough in Battery Longevity',
      description: 'Solid-state batteries reach 10,000 cycles.',
      source: 'BBC News',
      url: 'https://www.bbc.com/news/battery-breakthrough',
      published_at: '2026-10-05T12:00:00.000Z',
      category: 'technology',
      author: 'BBC News',
    },
    {
      id: 'art-2',
      title: 'Global Tech Giants Announce AI Safety Compact',
      description: 'Standards unified across leading labs.',
      source: 'TechCrunch',
      url: 'https://techcrunch.com/safety-compact',
      published_at: '2026-10-05T11:00:00.000Z',
      category: 'technology',
      author: 'TechCrunch',
    },
    {
      id: 'art-3',
      title: 'Indian Space Agency Prepares Next Orbital Mission',
      description: 'Launch countdown proceeds smoothly.',
      source: 'The Hindu',
      url: 'https://www.thehindu.com/sci-tech/orbital-mission',
      published_at: '2026-10-05T10:00:00.000Z',
      category: 'science',
      author: 'The Hindu',
    },
  ];

  it('returns articles with cursor pagination and publisher sources', async () => {
    saveRssArticles(testArticles);

    const req = new NextRequest('http://localhost:3000/api/rss?limit=2');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(2);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBeDefined();
    expect(data.total).toBe(3);
    expect(data.sources).toContain('BBC News');
    expect(data.sources).toContain('The Hindu');
  });

  it('filters by publisher source', async () => {
    saveRssArticles(testArticles);

    const req = new NextRequest('http://localhost:3000/api/rss?source=TechCrunch');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(1);
    expect(data.items[0].author).toBe('TechCrunch');
  });

  it('filters by category', async () => {
    saveRssArticles(testArticles);

    const req = new NextRequest('http://localhost:3000/api/rss?category=science');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(1);
    expect(data.items[0].category).toBe('science');
  });

  it('handles cursor to advance to next page', async () => {
    saveRssArticles(testArticles);

    // Fetch page 1
    const req1 = new NextRequest('http://localhost:3000/api/rss?limit=2');
    const res1 = await GET(req1);
    const data1 = await res1.json();
    const cursor = data1.nextCursor;

    // Fetch page 2 using cursor
    const req2 = new NextRequest(
      `http://localhost:3000/api/rss?cursor=${encodeURIComponent(cursor)}&limit=2`
    );
    const res2 = await GET(req2);
    const data2 = await res2.json();

    expect(data2.items).toHaveLength(1);
    expect(data2.hasMore).toBe(false);
    expect(data2.items[0].id).toBe('art-3');
  });

  it('translates RSS articles into requested language with 100% translation', async () => {
    saveRssArticles(testArticles);

    const req = new NextRequest('http://localhost:3000/api/rss?limit=3&lang=hi');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(3);
    for (const item of data.items) {
      expect(item.isTranslated).toBe(true);
      expect(item.language).toBe('hi');
      expect(item.title).toBeDefined();
      expect(item.description).toBeDefined();
      const latinLetters = item.title.match(/[a-zA-Z]{2,}/g);
      expect(latinLetters).toBeNull();
    }
  });

  it('publishes a new article and detects changes on update via POST /api/rss', async () => {
    // 1. Publish new article
    const newArticlePayload = {
      action: 'publish_article',
      article: {
        id: 'rss-live-test-1',
        title: 'Initial Breaking News Story',
        description: 'First report on developing situation.',
        url: 'https://news.local/story-1',
        category: 'world',
        source: 'Reuters',
      },
    };

    const req1 = new NextRequest('http://localhost:3000/api/rss', {
      method: 'POST',
      body: JSON.stringify(newArticlePayload),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.isNew).toBe(true);
    expect(data1.isUpdated).toBe(false);

    // 2. Update existing article
    const updateArticlePayload = {
      action: 'update_article',
      article: {
        id: 'rss-live-test-1',
        title: 'UPDATED: Complete Verification of Breaking News Story',
        description: 'Officials confirm resolution to the event.',
        url: 'https://news.local/story-1',
        category: 'world',
        source: 'Reuters',
      },
    };

    const req2 = new NextRequest('http://localhost:3000/api/rss', {
      method: 'POST',
      body: JSON.stringify(updateArticlePayload),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.isNew).toBe(false);
    expect(data2.isUpdated).toBe(true);
    expect(data2.item.title).toBe('UPDATED: Complete Verification of Breaking News Story');
    expect(data2.item.isUpdated).toBe(true);
  });
});
