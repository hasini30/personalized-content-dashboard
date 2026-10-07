import {
  fetchAndParseFeed,
  ingestAllRssFeeds,
  startRssIngestionScheduler,
  stopRssIngestionScheduler,
  getIngestionStatus,
} from '@/lib/rss/rssIngestionService';
import { RssFeedConfig } from '@/lib/rss/rssFeedRegistry';
import { initDatabase, closeDatabase } from '@/lib/db/database';
import { clearRssArticles } from '@/lib/db/rssRepository';

const mockFeed: RssFeedConfig = {
  id: 'mock-reuters-top',
  name: 'Reuters World',
  publisher: 'Reuters',
  category: 'world',
  url: 'https://mock.reuters.com/rss.xml',
  defaultImage: 'https://images.unsplash.com/mock-reuters.jpg',
};

const mockFeedXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Reuters - World News</title>
    <item>
      <title>Diplomatic Summit Reaches Accord on Global Emissions - Reuters</title>
      <link>https://www.reuters.com/world/emissions-accord-2026</link>
      <description>Delegates finalize landmark cross-border carbon pricing framework.</description>
      <pubDate>Mon, 05 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://images.unsplash.com/summit.jpg" type="image/jpeg" />
    </item>
  </channel>
</rss>
`;

describe('RSS Ingestion Service', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    stopRssIngestionScheduler();
    closeDatabase();
  });

  beforeEach(() => {
    clearRssArticles();
    jest.clearAllMocks();
  });

  it('fetches and parses feed articles successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockFeedXml),
    });

    const articles = await fetchAndParseFeed(mockFeed);

    expect(articles).toHaveLength(1);
    expect(articles[0].source).toBe('Reuters');
    expect(articles[0].title).toBe('Diplomatic Summit Reaches Accord on Global Emissions');
    expect(articles[0].url).toBe('https://www.reuters.com/world/emissions-accord-2026');
    expect(articles[0].image_url).toBe('https://images.unsplash.com/summit.jpg');
  });

  it('gracefully handles network failures without throwing or crashing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection timed out'));

    const articles = await fetchAndParseFeed(mockFeed);
    expect(articles).toEqual([]);
  });

  it('gracefully handles HTTP error status codes (e.g. 404, 500)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const articles = await fetchAndParseFeed(mockFeed);
    expect(articles).toEqual([]);
  });

  it('ingests multiple feeds and reports statistics', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockFeedXml),
    });

    const result = await ingestAllRssFeeds([mockFeed]);

    expect(result.totalFeeds).toBe(1);
    expect(result.succeededFeeds).toBe(1);
    expect(result.newArticlesCount).toBe(1);
    expect(result.totalArticlesInDb).toBe(1);
  });

  it('starts and stops background ingestion scheduler safely', () => {
    startRssIngestionScheduler(60000);
    let status = getIngestionStatus();
    expect(status.isSchedulerActive).toBe(true);

    stopRssIngestionScheduler();
    status = getIngestionStatus();
    expect(status.isSchedulerActive).toBe(false);
  });
});
