import { createHash } from 'crypto';
import { ContentItem } from '@/types/content';
import { parseRssXml, ParsedRssItem } from './rssParser';
import { RssFeedConfig, getFeedsForCategory } from './rssFeedRegistry';
import { generateUnderstandableSummary } from '@/lib/newsSummaryUtils';
import { semanticSearchFilter } from '@/lib/semanticSearch';
import {
  getRssArticlesPaginated,
  saveRssArticles,
  DbRssArticle,
  getRssArticlesTotalCount,
  normalizeCategory,
} from '@/lib/db/rssRepository';
import { startRssIngestionScheduler } from './rssIngestionService';
import { isArticleDateFresh } from '@/lib/dateUtils';

interface FeedCacheEntry {
  items: ContentItem[];
  timestamp: number;
}

const FEED_CACHE = new Map<string, FeedCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Converts a parsed RSS item into a full ContentItem with Plain English summary.
 */
export function rssItemToContentItem(item: ParsedRssItem, feed: RssFeedConfig): ContentItem {
  const cleanTitle = item.title.replace(/\s+-\s+[^-]+$/, '').trim();
  const category = item.category || feed.category;

  const idSource = item.link || `${cleanTitle}-${item.publishedAt}`;
  const hash = createHash('sha256').update(idSource).digest('hex').slice(0, 16);
  const id = `rss-${hash}`;

  const summary = generateUnderstandableSummary(
    cleanTitle,
    item.description,
    item.content,
    category
  );

  const publisher = feed.publisher || feed.name;

  return {
    id,
    source: 'news',
    title: cleanTitle,
    description: item.description,
    content: item.content || item.description,
    simplifiedSummary: summary,
    simplifiedOverview: summary.simpleOverview,
    imageUrl: item.imageUrl || feed.defaultImage,
    url: item.link || '#',
    category,
    publishedAt: item.publishedAt,
    author: item.author || publisher,
    hashtags: [category, publisher.toLowerCase().replace(/[^a-z0-9]/g, '')],
    isDemo: false, // Genuine live RSS news
  };
}

/**
 * Fetches and parses an individual RSS feed with timeout and memory caching.
 * Also persists fetched items into the database.
 */
export async function fetchSingleRssFeed(feed: RssFeedConfig): Promise<ContentItem[]> {
  const cached = FEED_CACHE.get(feed.id);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.items;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FeedPulse/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return cached?.items || [];
    }

    const xml = await res.text();
    const parsed = parseRssXml(xml, feed.category);
    const freshParsed = parsed.items.filter((it) => isArticleDateFresh(it.publishedAt, 7));
    const items = freshParsed.map((it) => rssItemToContentItem(it, feed));

    // Persist into database
    const dbArticles: DbRssArticle[] = items.map((it) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      content: it.content,
      source: feed.publisher || feed.name,
      url: it.url,
      published_at: it.publishedAt,
      image_url: it.imageUrl,
      category: it.category,
      author: it.author,
    }));
    saveRssArticles(dbArticles);

    FEED_CACHE.set(feed.id, {
      items,
      timestamp: now,
    });

    return items;
  } catch {
    // If fetch failed or timed out, return stale cache or empty list
    return cached?.items || [];
  }
}

export interface RssFetchOptions {
  category?: string;
  source?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  preferredCategories?: string[];
}

export interface RssNewsResult {
  items: ContentItem[];
  total: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  isRssLive: boolean;
}

/**
 * Concurrently fetches or queries RSS feeds for requested category, deduplicates,
 * and paginates. Primary storage is SQLite database with live RSS fallback.
 */
export async function getLiveRssNews(options: RssFetchOptions = {}): Promise<RssNewsResult> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize || 12));
  const category = options.category?.toLowerCase().trim() || 'all';
  const source = options.source?.trim();
  const q = options.q?.trim();

  // Start background periodic ingestion if not already running
  if (process.env.NODE_ENV !== 'test') {
    startRssIngestionScheduler();
  }

  // Check if database has articles matching query
  const totalInDb = getRssArticlesTotalCount({
    category: category !== 'all' ? category : undefined,
    source: source !== 'all' ? source : undefined,
    q,
  });

  if (totalInDb > 0 && process.env.NODE_ENV !== 'test') {
    const dbResult = getRssArticlesPaginated({
      page,
      pageSize,
      category,
      source,
      q,
    });

    return {
      items: dbResult.items,
      total: dbResult.total,
      hasMore: dbResult.hasMore,
      page,
      pageSize,
      isRssLive: dbResult.items.length > 0,
    };
  }

  // Fallback: Fetch target feeds directly (used in tests or initial cold start)
  const targetFeeds = getFeedsForCategory(category);
  const results = await Promise.allSettled(targetFeeds.map((feed) => fetchSingleRssFeed(feed)));

  const allItems: ContentItem[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const item of res.value) {
        if (!seenUrls.has(item.url) && !seenTitles.has(item.title.toLowerCase())) {
          seenUrls.add(item.url);
          seenTitles.add(item.title.toLowerCase());
          allItems.push(item);
        }
      }
    }
  }

  // Sort newest first
  allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  let filtered = allItems;

  if (category !== 'all') {
    const norm = normalizeCategory(category);
    filtered = filtered.filter((i) => {
      const itemNorm = normalizeCategory(i.category);
      return itemNorm === norm || i.category.toLowerCase().includes(norm);
    });
  }

  if (source && source !== 'all') {
    const sLower = source.toLowerCase().trim();
    filtered = filtered.filter((i) => {
      const authorLower = i.author?.toLowerCase() || '';
      const hashtagsLower = (i.hashtags || []).join(' ').toLowerCase();
      const urlLower = i.url.toLowerCase();
      return (
        authorLower.includes(sLower) ||
        sLower.includes(authorLower) ||
        hashtagsLower.includes(sLower.replace(/[^a-z0-9]/g, '')) ||
        urlLower.includes(sLower.replace(/\s+/g, ''))
      );
    });
  }

  if (q) {
    filtered = semanticSearchFilter(filtered, q);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const pagedItems = filtered.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < total;

  return {
    items: pagedItems,
    total,
    hasMore,
    page,
    pageSize,
    isRssLive: pagedItems.length > 0,
  };
}

/**
 * Clears the RSS cache (useful for testing or manual refreshes).
 */
export function clearRssCache(): void {
  FEED_CACHE.clear();
}
