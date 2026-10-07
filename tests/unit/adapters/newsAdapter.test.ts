import { newsAdapter, mapNewsArticles, NewsApiArticle } from '@/lib/adapters/newsAdapter';

describe('newsAdapter', () => {
  const sampleArticle: NewsApiArticle = {
    source: { id: 'the-verge', name: 'The Verge' },
    author: 'Nilay Patel',
    title: 'New AI Framework Revolutionizes Next.js Development - The Verge',
    description: 'A detailed breakdown of modern reactive rendering patterns and architecture.',
    url: 'https://theverge.com/2026/03/nextjs-ai-framework',
    urlToImage: 'https://theverge.com/images/cover.jpg',
    publishedAt: '2026-03-03T12:00:00Z',
    category: 'technology',
  };

  it('maps NewsApiArticle to normalized ContentItem with cleaned title', () => {
    const item = newsAdapter(sampleArticle, 'general', false);

    expect(item.source).toBe('news');
    expect(item.title).toBe('New AI Framework Revolutionizes Next.js Development');
    expect(item.description).toBe(
      'A detailed breakdown of modern reactive rendering patterns and architecture.'
    );
    expect(item.url).toBe('https://theverge.com/2026/03/nextjs-ai-framework');
    expect(item.imageUrl).toBe('https://theverge.com/images/cover.jpg');
    expect(item.category).toBe('technology');
    expect(item.publishedAt).toBe('2026-03-03T12:00:00Z');
    expect(item.author).toBe('Nilay Patel');
    expect(item.isDemo).toBe(false);
    expect(item.id).toMatch(/^news-/);
    expect(item.hashtags).toContain('technology');
  });

  it('handles missing author, description, and fallback category', () => {
    const minimalArticle: NewsApiArticle = {
      title: 'Breaking Tech News',
      url: 'https://example.com/breaking',
      publishedAt: '2026-03-03T14:00:00Z',
    };

    const item = newsAdapter(minimalArticle, 'science', true);

    expect(item.title).toBe('Breaking Tech News');
    expect(item.category).toBe('science');
    expect(item.author).toBe('News Desk');
    expect(item.description).toContain('Read the full story');
    expect(item.isDemo).toBe(true);
    expect(item.imageUrl).toBeUndefined();
  });

  it('maps an array of articles safely ignoring invalid entries', () => {
    const articles: NewsApiArticle[] = [
      sampleArticle,
      // @ts-expect-error test invalid item
      null,
      {
        title: 'Second Article',
        url: 'https://example.com/2',
        publishedAt: '2026-03-03T15:00:00Z',
      },
    ];

    const results = mapNewsArticles(articles, 'technology');
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('New AI Framework Revolutionizes Next.js Development');
    expect(results[1].title).toBe('Second Article');
  });
});
