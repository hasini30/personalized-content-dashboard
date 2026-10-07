import {
  fetchSingleRssFeed,
  getLiveRssNews,
  rssItemToContentItem,
  clearRssCache,
} from '@/lib/rss/rssService';
import { RssFeedConfig } from '@/lib/rss/rssFeedRegistry';

const mockFeedConfig: RssFeedConfig = {
  id: 'test-tech-feed',
  name: 'Tech Chronicle',
  category: 'technology',
  url: 'https://tech.example.com/rss.xml',
  defaultImage: 'https://images.unsplash.com/default-tech.jpg',
};

const sampleRssXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech Chronicle</title>
    <item>
      <title>Neural Accelerators Transform Micro-Satellites</title>
      <link>https://tech.example.com/micro-satellites</link>
      <description>Edge compute modules allow real-time orbital analytics.</description>
      <pubDate>Sun, 04 Oct 2026 08:30:00 GMT</pubDate>
      <author>Dr. Lisa Vance</author>
      <enclosure url="https://images.unsplash.com/satellite.jpg" type="image/jpeg" />
      <category>Technology</category>
    </item>
  </channel>
</rss>
`;

describe('RSS Service and Aggregator', () => {
  beforeEach(() => {
    clearRssCache();
    jest.clearAllMocks();
  });

  it('converts parsed RSS item to standard ContentItem with Plain English summary', () => {
    const item = {
      title: 'Neural Accelerators Transform Micro-Satellites',
      link: 'https://tech.example.com/micro-satellites',
      description: 'Edge compute modules allow real-time orbital analytics.',
      publishedAt: '2026-10-04T08:30:00.000Z',
      author: 'Dr. Lisa Vance',
      imageUrl: 'https://images.unsplash.com/satellite.jpg',
      category: 'technology',
    };

    const contentItem = rssItemToContentItem(item, mockFeedConfig);

    expect(contentItem.id).toMatch(/^rss-/);
    expect(contentItem.source).toBe('news');
    expect(contentItem.title).toBe('Neural Accelerators Transform Micro-Satellites');
    expect(contentItem.simplifiedSummary).toBeDefined();
    expect(contentItem.simplifiedSummary?.bulletPoints).toHaveLength(3);
    expect(contentItem.isDemo).toBe(false);
    expect(contentItem.imageUrl).toBe('https://images.unsplash.com/satellite.jpg');
  });

  it('fetches single RSS feed and caches result', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(sampleRssXml),
    });

    const items = await fetchSingleRssFeed(mockFeedConfig);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Neural Accelerators Transform Micro-Satellites');

    // Second fetch should use cache without calling fetch again
    const cachedItems = await fetchSingleRssFeed(mockFeedConfig);
    expect(cachedItems).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('aggregates live news across feeds with category filtering and pagination', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(sampleRssXml),
    });

    const result = await getLiveRssNews({
      category: 'technology',
      page: 1,
      pageSize: 5,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].category).toBe('technology');
    expect(result.isRssLive).toBe(true);
  });

  it('handles fetch failures gracefully and returns empty list', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const items = await fetchSingleRssFeed(mockFeedConfig);
    expect(items).toEqual([]);
  });
});
