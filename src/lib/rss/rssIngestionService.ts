import { createHash } from 'crypto';
import { getAllRssFeeds, RssFeedConfig } from './rssFeedRegistry';
import { parseRssXml } from './rssParser';
import {
  saveRssArticles,
  DbRssArticle,
  getRssArticlesTotalCount,
  purgeOutdatedRssArticles,
} from '@/lib/db/rssRepository';
import { newsBroadcaster } from '@/lib/events/newsBroadcaster';
import { ContentItem } from '@/types/content';
import { isArticleDateFresh } from '@/lib/dateUtils';

export interface IngestionResult {
  totalFeeds: number;
  succeededFeeds: number;
  failedFeeds: number;
  newArticlesCount: number;
  updatedArticlesCount: number;
  totalArticlesInDb: number;
  newArticles?: ContentItem[];
  updatedArticles?: ContentItem[];
}

let schedulerTimer: NodeJS.Timeout | null = null;
let isIngesting = false;
let lastIngestionTime = 0;

/**
 * Strips common publisher suffix patterns from headline titles for clean display.
 */
function cleanArticleTitle(title: string, publisher: string): string {
  if (!title) return '';
  const regex = new RegExp(
    `\\s+[-|–—]\\s+(${publisher}|BBC News|BBC|Reuters|The Hindu|Times of India|TechCrunch|The Guardian).*$`,
    'i'
  );
  return title.replace(regex, '').trim();
}

/**
 * Fetches and parses a single RSS feed with timeout protection.
 * Handles failed feeds gracefully without throwing or halting execution.
 */
export async function fetchAndParseFeed(feed: RssFeedConfig): Promise<DbRssArticle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      console.warn(
        `[RSS Ingestion] Feed HTTP ${res.status} error for "${feed.name}" (${feed.url})`
      );
      return [];
    }

    const xml = await res.text();
    const parsed = parseRssXml(xml, feed.category);

    const articles: DbRssArticle[] = [];

    for (const item of parsed.items) {
      const cleanTitle = cleanArticleTitle(item.title, feed.publisher);

      // Skip podcast episodes since podcasts are removed from the application
      const isPodcast =
        cleanTitle.toLowerCase().includes('podcast') ||
        item.link.toLowerCase().includes('/podcast') ||
        (item.category && item.category.toLowerCase().includes('podcast'));
      if (isPodcast) continue;

      // Skip outdated articles from past years or older than 7 days
      if (!isArticleDateFresh(item.publishedAt, 7)) {
        continue;
      }

      const idSource = item.link || `${cleanTitle}-${item.publishedAt}`;
      const hash = createHash('sha256').update(idSource).digest('hex').slice(0, 16);
      const id = `rss-${hash}`;

      articles.push({
        id,
        title: cleanTitle || item.title,
        description: item.description || '',
        content: item.content || item.description || '',
        source: feed.publisher || feed.name,
        url: item.link,
        published_at: item.publishedAt,
        image_url: item.imageUrl || feed.defaultImage,
        category: item.category || feed.category,
        author: item.author || feed.publisher || feed.name,
      });
    }

    return articles;
  } catch (error) {
    console.warn(
      `[RSS Ingestion] Gracefully handled error fetching "${feed.name}": ${(error as Error).message}`
    );
    return [];
  }
}

/**
 * Ingests all active RSS feeds concurrently, deduplicates, and persists into SQLite.
 * Automatically detects newly published articles and modifications to existing stories,
 * and broadcasts changes live without requiring manual page reload.
 */
export async function ingestAllRssFeeds(customFeeds?: RssFeedConfig[]): Promise<IngestionResult> {
  if (isIngesting) {
    return {
      totalFeeds: 0,
      succeededFeeds: 0,
      failedFeeds: 0,
      newArticlesCount: 0,
      updatedArticlesCount: 0,
      totalArticlesInDb: getRssArticlesTotalCount(),
    };
  }

  isIngesting = true;
  lastIngestionTime = Date.now();

  try {
    const feeds = customFeeds || getAllRssFeeds(true);
    const results = await Promise.allSettled(feeds.map((feed) => fetchAndParseFeed(feed)));

    let succeeded = 0;
    let failed = 0;
    const allArticles: DbRssArticle[] = [];

    for (const res of results) {
      if (res.status === 'fulfilled') {
        succeeded++;
        allArticles.push(...res.value);
      } else {
        failed++;
      }
    }

    // Purge outdated articles older than 7 days before saving new ones
    purgeOutdatedRssArticles(7);

    // Persist into database with change detection
    const { insertedCount, updatedCount, newArticles, updatedArticles } =
      saveRssArticles(allArticles);
    const totalArticlesInDb = getRssArticlesTotalCount();

    // Broadcast newly published articles and existing article updates live to all connected clients
    if (newArticles.length > 0 || updatedArticles.length > 0) {
      newsBroadcaster.broadcastBatchChanges(newArticles, updatedArticles);
    }

    return {
      totalFeeds: feeds.length,
      succeededFeeds: succeeded,
      failedFeeds: failed,
      newArticlesCount: insertedCount,
      updatedArticlesCount: updatedCount || 0,
      totalArticlesInDb,
      newArticles,
      updatedArticles,
    };
  } finally {
    isIngesting = false;
  }
}

/**
 * Manually triggers an immediate ingestion pass and change broadcast.
 */
export async function triggerImmediateIngestion(
  customFeeds?: RssFeedConfig[]
): Promise<IngestionResult> {
  return ingestAllRssFeeds(customFeeds);
}

/**
 * Starts automatic backend periodic RSS fetching at specified interval (default 30 seconds).
 * Uses unref() so the background timer will never hold test suites or process exits open.
 */
export function startRssIngestionScheduler(intervalMs = 30 * 1000): void {
  if (schedulerTimer) {
    return; // Already active
  }

  // Trigger immediate background sync so latest breaking news is ingested as soon as app starts (in dev/prod)
  if (process.env.NODE_ENV !== 'test') {
    ingestAllRssFeeds().catch((err) =>
      console.warn('[RSS Ingestion] Initial background sync error:', err.message)
    );
  }

  schedulerTimer = setInterval(() => {
    ingestAllRssFeeds().catch((err) =>
      console.warn('[RSS Ingestion] Periodic sync error:', err.message)
    );
  }, intervalMs);

  // Unref ensures process can exit cleanly
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
}

/**
 * Stops the automatic backend periodic scheduler.
 */
export function stopRssIngestionScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

/**
 * Checks if ingestion is currently active or when it last ran.
 */
export function getIngestionStatus(): {
  isSchedulerActive: boolean;
  isIngesting: boolean;
  lastIngestionTime: number;
  totalArticlesInDb: number;
} {
  return {
    isSchedulerActive: schedulerTimer !== null,
    isIngesting,
    lastIngestionTime,
    totalArticlesInDb: getRssArticlesTotalCount(),
  };
}
