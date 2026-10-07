import { getDb } from './database';
import { ContentItem } from '@/types/content';
import { generateUnderstandableSummary } from '@/lib/newsSummaryUtils';
import { isDateFromPreviousYears } from '@/lib/dateUtils';

export interface DbRssArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  source: string;
  url: string;
  published_at: string;
  image_url?: string;
  category: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RssCursorPayload {
  p: string; // published_at
  i: string; // id
}

export function encodeCursor(article: { published_at: string; id: string }): string {
  const payload: RssCursorPayload = {
    p: article.published_at,
    i: article.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursorStr: string): RssCursorPayload | null {
  try {
    const raw = Buffer.from(cursorStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as RssCursorPayload;
    if (parsed && typeof parsed.p === 'string' && typeof parsed.i === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function dbArticleToContentItem(row: DbRssArticle): ContentItem {
  const category = row.category || 'general';
  const summary = generateUnderstandableSummary(row.title, row.description, row.content, category);

  return {
    id: row.id,
    source: 'news',
    title: row.title,
    description: row.description,
    content: row.content || row.description,
    simplifiedSummary: summary,
    simplifiedOverview: summary.simpleOverview,
    imageUrl: row.image_url || undefined,
    url: row.url,
    category,
    publishedAt: row.published_at,
    author: row.source || row.author || 'RSS News',
    hashtags: [category, row.source.toLowerCase().replace(/[^a-z0-9]/g, '')],
    isDemo: false,
    isUpdated: Boolean(row.updated_at),
    updatedAt: row.updated_at || undefined,
  };
}

export interface SaveArticlesResult {
  insertedCount: number;
  updatedCount: number;
  newArticles: ContentItem[];
  updatedArticles: ContentItem[];
}

/**
 * Saves a single article with change detection.
 * Returns true if newly inserted, false if already exists (even if updated).
 */
export function saveRssArticle(article: DbRssArticle): boolean {
  const result = saveRssArticleWithChangeDetection(article);
  return result.isNew;
}

/**
 * Saves or updates an article, detecting changes in title, description, content, image, or date.
 */
export function saveRssArticleWithChangeDetection(article: DbRssArticle): {
  isNew: boolean;
  isUpdated: boolean;
  item: ContentItem;
} {
  // Reject outdated articles from previous calendar years immediately
  if (isDateFromPreviousYears(article.published_at)) {
    return {
      isNew: false,
      isUpdated: false,
      item: dbArticleToContentItem(article),
    };
  }

  const db = getDb();
  const now = new Date().toISOString();

  // Check if article already exists by URL or ID
  const checkStmt = db.prepare(`
    SELECT id, title, description, content, source, url, published_at, image_url, category, author, created_at, updated_at
    FROM rss_articles
    WHERE url = ? OR id = ?
    LIMIT 1
  `);

  const existing = checkStmt.get(article.url, article.id) as DbRssArticle | undefined;

  if (!existing) {
    const insertStmt = db.prepare(`
      INSERT INTO rss_articles (
        id, title, description, content, source, url, published_at, image_url, category, author, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      article.id,
      article.title,
      article.description || '',
      article.content || article.description || '',
      article.source,
      article.url,
      article.published_at,
      article.image_url || null,
      article.category || 'general',
      article.author || null,
      article.created_at || now,
      article.updated_at || null
    );

    const savedItem = dbArticleToContentItem({
      ...article,
      created_at: article.created_at || now,
    });

    return {
      isNew: true,
      isUpdated: false,
      item: { ...savedItem, isLive: true },
    };
  }

  // Article exists: detect if title, description, content, image, or published_at changed
  const titleChanged = article.title ? article.title.trim() !== existing.title.trim() : false;
  const descChanged =
    article.description !== undefined
      ? article.description.trim() !== (existing.description || '').trim()
      : false;
  const contentChanged =
    article.content !== undefined
      ? article.content.trim() !== (existing.content || '').trim()
      : false;
  const imageChanged =
    article.image_url !== undefined && article.image_url !== null
      ? article.image_url !== existing.image_url
      : false;
  const pubChanged = article.published_at && article.published_at !== existing.published_at;

  const hasChanged = titleChanged || descChanged || contentChanged || imageChanged || pubChanged;

  if (hasChanged) {
    const updatedTitle = article.title || existing.title;
    const updatedDesc = article.description ?? existing.description;
    const updatedContent = article.content ?? existing.content;
    const updatedImage = article.image_url ?? existing.image_url;
    const updatedPub = article.published_at || existing.published_at;
    const updatedCategory = article.category || existing.category;
    const updatedAuthor = article.author || existing.author;
    const updatedAt = now;

    const updateStmt = db.prepare(`
      UPDATE rss_articles
      SET title = ?, description = ?, content = ?, image_url = ?, published_at = ?, category = ?, author = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      updatedTitle,
      updatedDesc,
      updatedContent,
      updatedImage || null,
      updatedPub,
      updatedCategory,
      updatedAuthor || null,
      updatedAt,
      existing.id
    );

    const updatedRow: DbRssArticle = {
      id: existing.id,
      title: updatedTitle,
      description: updatedDesc,
      content: updatedContent,
      source: existing.source,
      url: existing.url,
      published_at: updatedPub,
      image_url: updatedImage,
      category: updatedCategory,
      author: updatedAuthor,
      created_at: existing.created_at,
      updated_at: updatedAt,
    };

    const item = dbArticleToContentItem(updatedRow);

    return {
      isNew: false,
      isUpdated: true,
      item: {
        ...item,
        isUpdated: true,
        updatedAt,
      },
    };
  }

  return {
    isNew: false,
    isUpdated: false,
    item: dbArticleToContentItem(existing),
  };
}

/**
 * Bulk saves multiple articles with change detection.
 * Automatically inserts new articles and updates existing ones if content modified.
 */
export function saveRssArticles(articles: DbRssArticle[]): SaveArticlesResult {
  return saveRssArticlesWithChangeDetection(articles);
}

/**
 * Enhanced bulk save with explicit change detection result.
 */
export function saveRssArticlesWithChangeDetection(articles: DbRssArticle[]): SaveArticlesResult {
  if (!articles || articles.length === 0) {
    return {
      insertedCount: 0,
      updatedCount: 0,
      newArticles: [],
      updatedArticles: [],
    };
  }

  let insertedCount = 0;
  let updatedCount = 0;
  const newArticles: ContentItem[] = [];
  const updatedArticles: ContentItem[] = [];

  for (const article of articles) {
    try {
      const res = saveRssArticleWithChangeDetection(article);
      if (res.isNew) {
        insertedCount++;
        newArticles.push(res.item);
      } else if (res.isUpdated) {
        updatedCount++;
        updatedArticles.push(res.item);
      }
    } catch {
      // Continue inserting subsequent articles
    }
  }

  return {
    insertedCount,
    updatedCount,
    newArticles,
    updatedArticles,
  };
}

export interface RssCursorQueryOptions {
  cursor?: string;
  limit?: number;
  category?: string;
  source?: string;
  q?: string;
  maxAgeDays?: number;
  includeOutdated?: boolean;
}

export interface RssCursorQueryResult {
  items: ContentItem[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

/**
 * Fetches RSS articles with cursor-based pagination for smooth infinite scrolling.
 * Sort order is published_at DESC, id DESC.
 * Enforces recency by default, excluding outdated articles from previous years or older than maxAgeDays (default 7).
 */
export function getRssArticlesWithCursor(
  options: RssCursorQueryOptions = {}
): RssCursorQueryResult {
  const db = getDb();
  const limit = Math.max(1, Math.min(50, options.limit || 12));
  const category =
    options.category && options.category !== 'all' ? options.category.toLowerCase().trim() : null;
  const source = options.source && options.source !== 'all' ? options.source.trim() : null;
  const q = options.q ? `%${options.q.trim().toLowerCase()}%` : null;

  const cursorPayload = options.cursor ? decodeCursor(options.cursor) : null;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Exclude outdated articles older than maxAgeDays (default 7) or from previous calendar years
  if (!options.includeOutdated) {
    const maxAgeDays = options.maxAgeDays ?? 7;
    const currentYear = new Date().getFullYear().toString();
    conditions.push("published_at >= datetime('now', '-' || ? || ' days')");
    params.push(maxAgeDays);
    conditions.push('substr(published_at, 1, 4) >= ?');
    params.push(currentYear);
  }

  if (cursorPayload) {
    conditions.push('(published_at < ? OR (published_at = ? AND id < ?))');
    params.push(cursorPayload.p, cursorPayload.p, cursorPayload.i);
  }

  if (category) {
    conditions.push('LOWER(category) = ?');
    params.push(category);
  }

  if (source) {
    conditions.push('LOWER(source) = LOWER(?)');
    params.push(source);
  }

  if (q) {
    conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
    params.push(q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const fetchLimit = limit + 1;

  const sql = `
    SELECT id, title, description, content, source, url, published_at, image_url, category, author, created_at, updated_at
    FROM rss_articles
    ${whereClause}
    ORDER BY published_at DESC, id DESC
    LIMIT ?
  `;

  params.push(fetchLimit);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as DbRssArticle[];

  const hasMore = rows.length > limit;
  const sliceRows = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | undefined;
  if (hasMore && sliceRows.length > 0) {
    const last = sliceRows[sliceRows.length - 1];
    nextCursor = encodeCursor(last);
  }

  const total = getRssArticlesTotalCount({
    category: category || undefined,
    source: source || undefined,
    q: options.q,
  });

  return {
    items: sliceRows.map(dbArticleToContentItem),
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Fetches RSS articles with offset-based page/pageSize pagination.
 */
export function getRssArticlesPaginated(options: {
  page?: number;
  pageSize?: number;
  category?: string;
  source?: string;
  q?: string;
  maxAgeDays?: number;
  includeOutdated?: boolean;
}): { items: ContentItem[]; total: number; page: number; pageSize: number; hasMore: boolean } {
  const db = getDb();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize || 12));
  const offset = (page - 1) * pageSize;
  const category =
    options.category && options.category !== 'all' ? options.category.toLowerCase().trim() : null;
  const source = options.source && options.source !== 'all' ? options.source.trim() : null;
  const q = options.q ? `%${options.q.trim().toLowerCase()}%` : null;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Exclude outdated articles older than maxAgeDays (default 7) or from previous calendar years
  if (!options.includeOutdated) {
    const maxAgeDays = options.maxAgeDays ?? 7;
    const currentYear = new Date().getFullYear().toString();
    conditions.push("published_at >= datetime('now', '-' || ? || ' days')");
    params.push(maxAgeDays);
    conditions.push('substr(published_at, 1, 4) >= ?');
    params.push(currentYear);
  }

  if (category) {
    conditions.push('LOWER(category) = ?');
    params.push(category);
  }

  if (source) {
    conditions.push('LOWER(source) = LOWER(?)');
    params.push(source);
  }

  if (q) {
    conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
    params.push(q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, title, description, content, source, url, published_at, image_url, category, author, created_at, updated_at
    FROM rss_articles
    ${whereClause}
    ORDER BY published_at DESC, id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(pageSize, offset);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as DbRssArticle[];
  const total = getRssArticlesTotalCount({
    category: category || undefined,
    source: source || undefined,
    q: options.q,
    maxAgeDays: options.maxAgeDays,
    includeOutdated: options.includeOutdated,
  });

  return {
    items: rows.map(dbArticleToContentItem),
    total,
    page,
    pageSize,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Finds a stored RSS article by ID.
 */
export function findRssArticleById(id: string): ContentItem | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, title, description, content, source, url, published_at, image_url, category, author, created_at, updated_at
    FROM rss_articles
    WHERE id = ?
    LIMIT 1
  `);
  const row = stmt.get(id) as DbRssArticle | undefined;
  return row ? dbArticleToContentItem(row) : null;
}

/**
 * Finds a stored RSS article by URL.
 */
export function findRssArticleByUrl(url: string): ContentItem | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, title, description, content, source, url, published_at, image_url, category, author, created_at, updated_at
    FROM rss_articles
    WHERE url = ?
    LIMIT 1
  `);
  const row = stmt.get(url) as DbRssArticle | undefined;
  return row ? dbArticleToContentItem(row) : null;
}

/**
 * Returns the total count of articles matching optional filters.
 * Excludes outdated articles older than maxAgeDays (default 7) or from previous calendar years unless includeOutdated is true.
 */
export function getRssArticlesTotalCount(
  options: {
    category?: string;
    source?: string;
    q?: string;
    maxAgeDays?: number;
    includeOutdated?: boolean;
  } = {}
): number {
  const db = getDb();
  const category =
    options.category && options.category !== 'all' ? options.category.toLowerCase().trim() : null;
  const source = options.source && options.source !== 'all' ? options.source.trim() : null;
  const q = options.q ? `%${options.q.trim().toLowerCase()}%` : null;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Exclude outdated articles older than maxAgeDays (default 7) or from previous calendar years
  if (!options.includeOutdated) {
    const maxAgeDays = options.maxAgeDays ?? 7;
    const currentYear = new Date().getFullYear().toString();
    conditions.push("published_at >= datetime('now', '-' || ? || ' days')");
    params.push(maxAgeDays);
    conditions.push('substr(published_at, 1, 4) >= ?');
    params.push(currentYear);
  }

  if (category) {
    conditions.push('LOWER(category) = ?');
    params.push(category);
  }

  if (source) {
    conditions.push('LOWER(source) = LOWER(?)');
    params.push(source);
  }

  if (q) {
    conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
    params.push(q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM rss_articles ${whereClause}`);
  const row = stmt.get(...params) as { count: number } | undefined;
  return row?.count || 0;
}

/**
 * Permanently purges outdated articles older than maxAgeDays or from previous calendar years.
 * Returns the count of deleted articles.
 */
export function purgeOutdatedRssArticles(maxAgeDays = 7): number {
  const db = getDb();
  const currentYear = new Date().getFullYear().toString();
  const stmt = db.prepare(`
    DELETE FROM rss_articles
    WHERE published_at < datetime('now', '-' || ? || ' days')
       OR substr(published_at, 1, 4) < ?
  `);
  const result = stmt.run(maxAgeDays, currentYear);
  return Number(result.changes);
}

/**
 * Returns distinct publisher sources currently stored in the database.
 */
export function getAvailableRssSources(): string[] {
  const db = getDb();
  const stmt = db.prepare('SELECT DISTINCT source FROM rss_articles ORDER BY source ASC');
  const rows = stmt.all() as { source: string }[];
  return rows.map((r) => r.source).filter(Boolean);
}

/**
 * Deletes all RSS articles (primarily for testing or reset).
 */
export function clearRssArticles(): void {
  const db = getDb();
  db.exec('DELETE FROM rss_articles;');
}
