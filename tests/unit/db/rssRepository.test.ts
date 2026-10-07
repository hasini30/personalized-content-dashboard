import {
  saveRssArticle,
  saveRssArticles,
  saveRssArticleWithChangeDetection,
  saveRssArticlesWithChangeDetection,
  findRssArticleById,
  findRssArticleByUrl,
  getRssArticlesWithCursor,
  getRssArticlesPaginated,
  getRssArticlesTotalCount,
  getAvailableRssSources,
  clearRssArticles,
  purgeOutdatedRssArticles,
  encodeCursor,
  decodeCursor,
  DbRssArticle,
} from '@/lib/db/rssRepository';
import { initDatabase, closeDatabase, getDb } from '@/lib/db/database';

describe('RSS Repository with SQLite Database', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    clearRssArticles();
  });

  const sampleArticles: DbRssArticle[] = [
    {
      id: 'rss-1',
      title: 'Global Renewable Energy Reaches New Milestone',
      description: 'Solar and wind additions surged 40% year over year.',
      content: 'Detailed reporting on international clean power infrastructure.',
      source: 'BBC News',
      url: 'https://www.bbc.com/news/clean-energy-100',
      published_at: '2026-10-05T12:00:00.000Z',
      category: 'science',
      author: 'BBC News',
    },
    {
      id: 'rss-2',
      title: 'Quantum Processor Sets New Speed Record',
      description: 'Superconducting qubit coherence times doubled in laboratory tests.',
      content: 'Engineers achieve quantum advantage benchmark in cryptography.',
      source: 'TechCrunch',
      url: 'https://techcrunch.com/quantum-benchmark-2026',
      published_at: '2026-10-05T11:00:00.000Z',
      category: 'technology',
      author: 'TechCrunch',
    },
    {
      id: 'rss-3',
      title: 'Indian Semiconductor Hub Attracts Major Investments',
      description: 'State-of-the-art fabrication unit planned near Chennai.',
      content: 'Government announces multi-billion dollar packaging ecosystem.',
      source: 'The Hindu',
      url: 'https://www.thehindu.com/business/semiconductor-investment',
      published_at: '2026-10-05T10:00:00.000Z',
      category: 'business',
      author: 'The Hindu',
    },
    {
      id: 'rss-4',
      title: 'Global Markets Rally on Strong Economic Indicators',
      description: 'Indices advance across Asia and Europe.',
      content: 'Central banks signal confidence in inflation stabilization.',
      source: 'Reuters',
      url: 'https://www.reuters.com/markets/global-rally',
      published_at: '2026-10-05T09:00:00.000Z',
      category: 'business',
      author: 'Reuters',
    },
  ];

  it('saves an individual article into the database', () => {
    const inserted = saveRssArticle(sampleArticles[0]);
    expect(inserted).toBe(true);

    const count = getRssArticlesTotalCount();
    expect(count).toBe(1);
  });

  it('prevents duplicate articles with the same URL (INSERT OR IGNORE)', () => {
    saveRssArticle(sampleArticles[0]);
    // Try to insert same article again with same URL
    const duplicateInserted = saveRssArticle({
      ...sampleArticles[0],
      id: 'rss-diff-id',
      title: 'Duplicate Title',
    });

    expect(duplicateInserted).toBe(false);
    expect(getRssArticlesTotalCount()).toBe(1);
  });

  it('bulk saves multiple articles without throwing on duplicates', () => {
    const { insertedCount } = saveRssArticles(sampleArticles);
    expect(insertedCount).toBe(4);
    expect(getRssArticlesTotalCount()).toBe(4);

    // Re-inserting should insert 0 new articles
    const secondBatch = saveRssArticles(sampleArticles);
    expect(secondBatch.insertedCount).toBe(0);
    expect(getRssArticlesTotalCount()).toBe(4);
  });

  it('supports cursor-based pagination for infinite scrolling', () => {
    saveRssArticles(sampleArticles);

    // Page 1: limit 2
    const firstPage = getRssArticlesWithCursor({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toBeDefined();
    expect(firstPage.items[0].id).toBe('rss-1');
    expect(firstPage.items[1].id).toBe('rss-2');

    // Page 2: with cursor
    const secondPage = getRssArticlesWithCursor({
      cursor: firstPage.nextCursor,
      limit: 2,
    });
    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.items[0].id).toBe('rss-3');
    expect(secondPage.items[1].id).toBe('rss-4');
    expect(secondPage.hasMore).toBe(false);
  });

  it('filters articles by category and publisher source', () => {
    saveRssArticles(sampleArticles);

    const businessItems = getRssArticlesPaginated({ category: 'business' });
    expect(businessItems.items).toHaveLength(2);

    const hinduItems = getRssArticlesPaginated({ source: 'The Hindu' });
    expect(hinduItems.items).toHaveLength(1);
    expect(hinduItems.items[0].title).toContain('Semiconductor');
  });

  it('encodes and decodes base64url pagination cursors cleanly', () => {
    const original = { published_at: '2026-10-05T12:00:00.000Z', id: 'rss-test-id' };
    const cursorStr = encodeCursor(original);
    const decoded = decodeCursor(cursorStr);

    expect(decoded).toEqual({
      p: '2026-10-05T12:00:00.000Z',
      i: 'rss-test-id',
    });
  });

  it('returns available distinct publisher sources', () => {
    saveRssArticles(sampleArticles);
    const sources = getAvailableRssSources();

    expect(sources).toContain('BBC News');
    expect(sources).toContain('Reuters');
    expect(sources).toContain('The Hindu');
    expect(sources).toContain('TechCrunch');
  });

  it('detects changes when an existing article is updated by a publisher', () => {
    // 1. Save original article
    const firstResult = saveRssArticleWithChangeDetection(sampleArticles[0]);
    expect(firstResult.isNew).toBe(true);
    expect(firstResult.isUpdated).toBe(false);

    // 2. Publisher updates the headline and description
    const updatedPayload: DbRssArticle = {
      ...sampleArticles[0],
      title: 'UPDATED: Global Renewable Energy Reaches Record 90% Milestone',
      description: 'Major international grid regulators confirm 90% peak renewable penetration.',
    };

    const secondResult = saveRssArticleWithChangeDetection(updatedPayload);
    expect(secondResult.isNew).toBe(false);
    expect(secondResult.isUpdated).toBe(true);
    expect(secondResult.item.title).toBe(
      'UPDATED: Global Renewable Energy Reaches Record 90% Milestone'
    );
    expect(secondResult.item.isUpdated).toBe(true);
    expect(secondResult.item.updatedAt).toBeDefined();

    // Verify stored article in DB was updated
    const fetched = findRssArticleById(sampleArticles[0].id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('UPDATED: Global Renewable Energy Reaches Record 90% Milestone');
    expect(fetched?.isUpdated).toBe(true);

    const fetchedByUrl = findRssArticleByUrl(sampleArticles[0].url);
    expect(fetchedByUrl?.id).toBe(sampleArticles[0].id);
  });

  it('bulk saves detecting both new and updated articles in the same batch', () => {
    // Save initial batch of 2 articles
    saveRssArticles([sampleArticles[0], sampleArticles[1]]);
    expect(getRssArticlesTotalCount()).toBe(2);

    // Next batch contains:
    // - sampleArticles[0] with updated title
    // - sampleArticles[1] unchanged
    // - sampleArticles[2] new article
    const mixedBatch: DbRssArticle[] = [
      {
        ...sampleArticles[0],
        title: 'Breakthrough Update in Clean Energy',
      },
      sampleArticles[1],
      sampleArticles[2],
    ];

    const result = saveRssArticlesWithChangeDetection(mixedBatch);
    expect(result.insertedCount).toBe(1); // sampleArticles[2]
    expect(result.updatedCount).toBe(1); // sampleArticles[0]
    expect(result.newArticles).toHaveLength(1);
    expect(result.updatedArticles).toHaveLength(1);
    expect(result.updatedArticles[0].title).toBe('Breakthrough Update in Clean Energy');
    expect(result.updatedArticles[0].isUpdated).toBe(true);

    // Total in DB should now be 3
    expect(getRssArticlesTotalCount()).toBe(3);
  });

  it('rejects articles from previous calendar years (e.g. 2024, 2025)', () => {
    const outdatedArticle: DbRssArticle = {
      id: 'rss-outdated-2024',
      title: 'Historical News From 2024',
      description: 'Old article description.',
      source: 'Reuters',
      url: 'https://reuters.com/historical-2024',
      published_at: '2024-05-15T08:00:00.000Z',
      category: 'technology',
      author: 'Reuters',
    };

    const inserted = saveRssArticle(outdatedArticle);
    expect(inserted).toBe(false);
    expect(getRssArticlesTotalCount({ includeOutdated: true })).toBe(0);
  });

  it('purges outdated articles older than maxAgeDays', () => {
    // Insert valid recent article
    saveRssArticle(sampleArticles[0]);
    expect(getRssArticlesTotalCount()).toBe(1);

    // Directly insert an older article into DB to test purge
    const db = getDb();
    db.prepare(
      `
      INSERT INTO rss_articles (id, title, description, content, source, url, published_at, category, author, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      'old-art-1',
      'Old Story From August',
      'Summary',
      'Content',
      'BBC News',
      'https://bbc.com/old-august',
      '2026-08-01T10:00:00.000Z',
      'general',
      'BBC News',
      '2026-08-01T10:00:00.000Z'
    );

    expect(getRssArticlesTotalCount({ includeOutdated: true })).toBe(2);
    // Recent count excludes it automatically
    expect(getRssArticlesTotalCount()).toBe(1);

    // Run purge
    const purged = purgeOutdatedRssArticles(7);
    expect(purged).toBe(1);

    // Now total in DB is only 1
    expect(getRssArticlesTotalCount({ includeOutdated: true })).toBe(1);
  });
});
