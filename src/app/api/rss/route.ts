import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { globalApiRateLimiter } from '@/lib/rateLimit';
import { languageCodeSchema } from '@/lib/languages';
import { getTranslator } from '@/lib/translation';
import { getUnderstandableSummary } from '@/lib/newsSummaryUtils';
import {
  getRssArticlesWithCursor,
  getRssArticlesPaginated,
  getAvailableRssSources,
  getRssArticlesTotalCount,
  saveRssArticleWithChangeDetection,
  DbRssArticle,
} from '@/lib/db/rssRepository';
import { ingestAllRssFeeds, startRssIngestionScheduler } from '@/lib/rss/rssIngestionService';
import { getAvailablePublishers, registerRssFeed } from '@/lib/rss/rssFeedRegistry';
import { translateArticleWithEngine } from '@/lib/translation/multilingualEngine';
import { TranslatedArticlePayload } from '@/lib/translation/types';
import { newsBroadcaster } from '@/lib/events/newsBroadcaster';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  q: z.string().optional(),
  lang: languageCodeSchema.default('en'),
  sync: z.enum(['true', 'false', '1', '0']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`rss:${ip}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    // Ensure scheduler is active in background
    startRssIngestionScheduler();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { cursor, limit, page, pageSize, category, source, q, lang, sync } = parsed.data;

    // Trigger explicit sync if requested or if DB is empty
    const currentTotal = getRssArticlesTotalCount();
    if (sync === 'true' || sync === '1' || currentTotal === 0) {
      await ingestAllRssFeeds().catch((err) =>
        console.warn('[RSS Route] Sync warning:', (err as Error).message)
      );
    }

    let items;
    let nextCursor: string | undefined;
    let hasMore = false;
    let total = 0;

    // Use cursor-based pagination if cursor is provided or page is not explicitly specified
    if (cursor || !page) {
      const cursorResult = getRssArticlesWithCursor({
        cursor,
        limit,
        category,
        source,
        q,
      });
      items = cursorResult.items;
      nextCursor = cursorResult.nextCursor;
      hasMore = cursorResult.hasMore;
      total = cursorResult.total;
    } else {
      // Offset-based pagination fallback
      const paginatedResult = getRssArticlesPaginated({
        page: page || 1,
        pageSize: pageSize || limit,
        category,
        source,
        q,
      });
      items = paginatedResult.items;
      hasMore = paginatedResult.hasMore;
      total = paginatedResult.total;
    }

    // Server-side translation if requested language is not English
    if (lang !== 'en' && items.length > 0) {
      const translator = getTranslator();
      let translatedPayloads: TranslatedArticlePayload[] = [];

      if (typeof translator.translateArticlesBatch === 'function') {
        try {
          translatedPayloads = await translator.translateArticlesBatch(
            items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              content: item.content,
            })),
            lang
          );
        } catch {
          translatedPayloads = [];
        }
      }

      items = items.map((item, idx) => {
        const trans = translatedPayloads[idx];
        if (trans && trans.isTranslated) {
          const summary = getUnderstandableSummary(
            {
              title: trans.title,
              description: trans.description,
              content: trans.content,
              category: item.category,
            },
            lang
          );
          return {
            ...item,
            title: trans.title,
            description: trans.description,
            simplifiedOverview: summary.simpleOverview,
            simplifiedSummary: summary,
            content: trans.content,
            language: trans.language,
            isTranslated: true,
            originalTitle: trans.originalTitle || item.title,
            originalDescription: trans.originalDescription || item.description,
            originalContent: trans.originalContent || item.content,
          };
        }

        // Guaranteed fallback to universal multilingual engine
        try {
          const fallbackTrans = translateArticleWithEngine(
            {
              id: item.id,
              title: item.title,
              description: item.description,
              content: item.content,
            },
            lang
          );
          const summary = getUnderstandableSummary(
            {
              title: fallbackTrans.title,
              description: fallbackTrans.description,
              content: fallbackTrans.content,
              category: item.category,
            },
            lang
          );
          return {
            ...item,
            title: fallbackTrans.title,
            description: fallbackTrans.description,
            simplifiedOverview: summary.simpleOverview,
            simplifiedSummary: summary,
            content: fallbackTrans.content,
            language: fallbackTrans.language,
            isTranslated: true,
            originalTitle: item.title,
            originalDescription: item.description,
            originalContent: item.content,
          };
        } catch {
          return item;
        }
      });
    }

    const dbSources = getAvailableRssSources();
    const configPublishers = getAvailablePublishers();
    const allPublishers = Array.from(new Set([...configPublishers, ...dbSources]));

    return NextResponse.json(
      {
        items,
        nextCursor: nextCursor || null,
        hasMore,
        total,
        page: page || 1,
        pageSize: pageSize || limit,
        sources: allPublishers,
        isRssLive: items.length > 0,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`rss-post:${ip}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'sync';

    if (action === 'sync') {
      const result = await ingestAllRssFeeds();
      return NextResponse.json({
        success: true,
        message: 'Synchronized configured RSS sources',
        result,
      });
    }

    if (action === 'register_feed' && body.feed) {
      registerRssFeed(body.feed);
      const result = await ingestAllRssFeeds([body.feed]);
      return NextResponse.json({
        success: true,
        message: `Registered and ingested feed "${body.feed.name}"`,
        result,
      });
    }

    if ((action === 'publish_article' || action === 'update_article') && body.article) {
      const articleData: DbRssArticle = {
        id: body.article.id || `rss-${Date.now()}`,
        title: body.article.title,
        description: body.article.description || '',
        content: body.article.content || body.article.description || '',
        source: body.article.source || 'Breaking News',
        url: body.article.url || `https://news.local/${Date.now()}`,
        published_at: body.article.published_at || new Date().toISOString(),
        image_url: body.article.image_url,
        category: body.article.category || 'general',
        author: body.article.author || body.article.source,
      };

      const result = saveRssArticleWithChangeDetection(articleData);
      if (result.isNew) {
        newsBroadcaster.broadcastNewArticle(result.item);
      } else if (result.isUpdated) {
        newsBroadcaster.broadcastUpdatedArticle(result.item);
      }

      return NextResponse.json({
        success: true,
        isNew: result.isNew,
        isUpdated: result.isUpdated,
        item: result.item,
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        validActions: ['sync', 'register_feed', 'publish_article', 'update_article'],
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
