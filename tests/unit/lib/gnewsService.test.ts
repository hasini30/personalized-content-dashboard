import { mapGNewsArticle, fetchFromGNews, GNewsArticle } from '@/lib/gnewsService';

describe('gnewsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('maps raw GNewsArticle into canonical NewsApiArticle structure', () => {
    const raw: GNewsArticle = {
      title: 'Global Tech Breakthrough',
      description: 'Researchers achieve quantum super-positioning.',
      content: 'Detailed report on quantum physics.',
      url: 'https://example.com/quantum',
      image: 'https://example.com/quantum.jpg',
      publishedAt: '2026-10-05T08:00:00Z',
      source: {
        name: 'The Verge',
        url: 'https://theverge.com',
      },
    };

    const mapped = mapGNewsArticle(raw, 'technology');

    expect(mapped.title).toBe('Global Tech Breakthrough');
    expect(mapped.description).toBe('Researchers achieve quantum super-positioning.');
    expect(mapped.url).toBe('https://example.com/quantum');
    expect(mapped.urlToImage).toBe('https://example.com/quantum.jpg');
    expect(mapped.source?.name).toBe('The Verge');
    expect(mapped.category).toBe('technology');
  });

  it('returns null when no GNews or News API key is provided', async () => {
    delete process.env.GNEWS_API_KEY;
    delete process.env.NEWS_API_KEY;

    const result = await fetchFromGNews({ category: 'technology' });
    expect(result).toBeNull();
  });

  it('fetches and maps articles from GNews API when key is present', async () => {
    process.env.GNEWS_API_KEY = 'mock-gnews-key-123';

    const mockResponse = {
      totalArticles: 15,
      articles: [
        {
          title: 'Autonomous Robotics Milestone',
          description: 'Humanoid robots deploy to manufacturing floor.',
          content: 'Full story on factory automation.',
          url: 'https://example.com/robotics',
          image: 'https://example.com/robotics.jpg',
          publishedAt: '2026-10-05T09:00:00Z',
          source: { name: 'TechCrunch', url: 'https://techcrunch.com' },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await fetchFromGNews({
      category: 'technology',
      lang: 'en',
      page: 1,
      pageSize: 5,
    });

    expect(result).not.toBeNull();
    expect(result?.isLive).toBe(true);
    expect(result?.total).toBe(15);
    expect(result?.articles).toHaveLength(1);
    expect(result?.articles[0].title).toBe('Autonomous Robotics Milestone');
  });

  it('handles HTTP error gracefully without throwing', async () => {
    process.env.GNEWS_API_KEY = 'mock-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    const result = await fetchFromGNews({ category: 'general' });
    expect(result).toBeNull();
  });
});
