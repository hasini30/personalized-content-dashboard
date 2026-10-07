import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapNewsArticles } from '@/lib/adapters/newsAdapter';
import { globalApiRateLimiter } from '@/lib/rateLimit';
import { languageCodeSchema } from '@/lib/languages';
import { getTranslator } from '@/lib/translation';
import { getNewsFeed } from '@/lib/newsEngine';
import { getLiveRssNews } from '@/lib/rss/rssService';
import { getUnderstandableSummary } from '@/lib/newsSummaryUtils';
import { ContentItem } from '@/types/content';
import { fetchFromGNews } from '@/lib/gnewsService';
import { deduplicateContentItems } from '@/lib/feedUtils';
import { translateArticleWithEngine } from '@/lib/translation/multilingualEngine';
import { TranslatedArticlePayload } from '@/lib/translation/types';
import { isArticleDateFresh } from '@/lib/dateUtils';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  q: z.string().optional(),
  country: z.string().optional(),
  sources: z.string().optional(),
  scope: z.enum(['preferred', 'all']).default('all'),
  preferredCategories: z.string().optional(),
  lang: languageCodeSchema.default('en'),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`news:${ip}`);
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

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { page, pageSize, category, q, country, sources, scope, preferredCategories, lang } =
      parsed.data;

    const prefList = preferredCategories
      ? preferredCategories
          .split(',')
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean)
      : [];

    let items: ContentItem[] = [];
    let isDemo = false;
    let total = 0;
    let hasMore = false;

    // 1. Primary Source: Live RSS Feeds from trusted publishers (BBC, Reuters, The Hindu, Times of India, TechCrunch, The Guardian)
    if (process.env.NODE_ENV !== 'test') {
      try {
        const rssResult = await getLiveRssNews({
          category,
          source: sources,
          q,
          page,
          pageSize,
          preferredCategories: prefList,
        });

        if (rssResult.items.length > 0) {
          items = rssResult.items;
          total = rssResult.total;
          hasMore = rssResult.hasMore;
          isDemo = false;
        }
      } catch {
        // Fall through cleanly
      }
    }

    // 2. Secondary Source: Real-time GNews API (if RSS empty or query unhandled)
    if (items.length === 0) {
      try {
        const gnewsResult = await fetchFromGNews({
          category,
          q,
          page,
          pageSize,
          lang,
          country,
        });

        if (gnewsResult && gnewsResult.articles.length > 0) {
          const gnewsItems = mapNewsArticles(gnewsResult.articles, category || 'general', false);
          items = gnewsItems;
          total = gnewsResult.total;
          hasMore = page * pageSize < total;
          isDemo = false;
        }
      } catch {
        // Fall through smoothly
      }
    }

    // 3. Tertiary Source: NewsAPI.org (if configured separately)
    const newsApiKey = process.env.NEWS_API_KEY;
    if (
      items.length === 0 &&
      newsApiKey &&
      newsApiKey.trim() !== '' &&
      newsApiKey !== process.env.GNEWS_API_KEY
    ) {
      try {
        const url = new URL(
          q ? 'https://newsapi.org/v2/everything' : 'https://newsapi.org/v2/top-headlines'
        );
        if (q) {
          url.searchParams.set('q', q);
        } else if (sources) {
          url.searchParams.set('sources', sources);
        } else {
          url.searchParams.set('country', country || 'us');
          if (category && category !== 'all') {
            url.searchParams.set('category', category.toLowerCase());
          }
        }
        url.searchParams.set('page', page.toString());
        url.searchParams.set('pageSize', pageSize.toString());

        const upstreamRes = await fetch(url.toString(), {
          headers: {
            'X-Api-Key': newsApiKey,
          },
          next: { revalidate: 300 },
        });

        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          if (data.status === 'ok' && Array.isArray(data.articles)) {
            items = mapNewsArticles(data.articles, category || 'general', false);
            total = data.totalResults || data.articles.length;
            hasMore = page * pageSize < total;
            isDemo = false;
          }
        }
      } catch {
        // Fall through
      }
    }

    // 4. Fallback to Curated News Engine if all live feeds returned no items
    if (items.length === 0) {
      isDemo = true;
      const feedResult = getNewsFeed({
        page,
        pageSize,
        category,
        q,
        sources,
        scope,
        preferredCategories: prefList,
      });

      items = feedResult.items;
      total = feedResult.total;
      hasMore = feedResult.hasMore;
    }

    // Filter out any articles that are outdated or from previous calendar years
    const freshOnly = items.filter((item) => isArticleDateFresh(item.publishedAt, 7));
    if (freshOnly.length > 0) {
      items = freshOnly;
    }

    if (prefList.length > 0) {
      items = items.map((item) => ({
        ...item,
        isPreferred: prefList.includes(item.category.toLowerCase()),
      }));
    }

    // Server-side translation if target language is not English
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

        // Guaranteed fallback to universal multilingual engine so NO news is left untranslated
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

    items = deduplicateContentItems(items);
    hasMore = hasMore || page * pageSize < total;

    return NextResponse.json(
      {
        items,
        page,
        pageSize,
        total,
        hasMore,
        isDemo,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
