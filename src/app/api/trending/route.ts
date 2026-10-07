import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapNewsArticles, NewsApiArticle } from '@/lib/adapters/newsAdapter';
import { globalApiRateLimiter } from '@/lib/rateLimit';
import { languageCodeSchema } from '@/lib/languages';
import { getTranslator } from '@/lib/translation';
import { getNewsFeed } from '@/lib/newsEngine';
import { ContentItem } from '@/types/content';

import { getLiveRssNews } from '@/lib/rss/rssService';
import { fetchFromGNews } from '@/lib/gnewsService';
import { deduplicateContentItems } from '@/lib/feedUtils';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  preferredCategories: z.string().optional(),
  lang: languageCodeSchema.default('en'),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`trending:${ip}`);
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

    const { page, pageSize, category, preferredCategories, lang } = parsed.data;

    const prefList = preferredCategories
      ? preferredCategories
          .split(',')
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean)
      : [];

    let articles: NewsApiArticle[] = [];
    let isDemo = false;
    let total = 0;

    // 1. Primary Upstream: Real-time GNews API
    try {
      const gnewsResult = await fetchFromGNews({
        category,
        page,
        pageSize,
        lang,
      });

      if (gnewsResult && gnewsResult.articles.length > 0) {
        articles = gnewsResult.articles;
        total = gnewsResult.total;
        isDemo = false;
      }
    } catch {
      // Fall through gracefully
    }

    // 2. Secondary Upstream: NewsAPI.org (if configured separately)
    const newsApiKey = process.env.NEWS_API_KEY;
    if (
      articles.length === 0 &&
      newsApiKey &&
      newsApiKey.trim() !== '' &&
      newsApiKey !== process.env.GNEWS_API_KEY
    ) {
      try {
        const url = new URL('https://newsapi.org/v2/top-headlines');
        url.searchParams.set('country', 'us');
        if (category && category !== 'all') {
          url.searchParams.set('category', category.toLowerCase());
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
            articles = data.articles;
            total = data.totalResults || data.articles.length;
            isDemo = false;
          }
        }
      } catch {
        // Fall through
      }
    }

    let items: ContentItem[] = [];
    let hasMore = false;

    if (articles.length > 0) {
      items = mapNewsArticles(articles, category || 'general', false);
      if (prefList.length > 0) {
        items = items.map((item) => ({
          ...item,
          isPreferred: prefList.includes(item.category.toLowerCase()),
        }));
      }
      hasMore = page * pageSize < total;
      isDemo = false;
    } else {
      // 3. Fallback: Multi-RSS Live Feeds
      try {
        const rssResult = await getLiveRssNews({
          category,
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
        // Fall through
      }

      // 4. Fallback: Curated News Engine
      if (items.length === 0) {
        isDemo = true;
        const feedResult = getNewsFeed({
          page,
          pageSize,
          category,
          scope: prefList.length > 0 ? 'preferred' : 'all',
          preferredCategories: prefList,
        });

        items = feedResult.items;
        total = feedResult.total;
        hasMore = feedResult.hasMore;
      }
    }

    if (prefList.length > 0 && items.length > 0) {
      items = items.map((item) => ({
        ...item,
        isPreferred: prefList.includes(item.category.toLowerCase()),
      }));

      // If no preferred items exist in the initial page slice, blend in preferred headlines
      const hasPreferred = items.some((i) => i.isPreferred);
      if (!hasPreferred) {
        const preferredFallback = getNewsFeed({
          page: 1,
          pageSize: 5,
          category: prefList[0],
          scope: 'all',
        });
        const preferredItems = preferredFallback.items.map((i) => ({
          ...i,
          isPreferred: true,
        }));
        if (preferredItems.length > 0) {
          items = [...preferredItems.slice(0, 3), ...items.slice(0, Math.max(1, pageSize - 3))];
        }
      }
    }

    // Server-side translation if target language is not English
    if (lang !== 'en') {
      const translator = getTranslator();
      items = await Promise.all(
        items.map(async (item) => {
          try {
            const trans = await translator.translateArticle(
              {
                id: item.id,
                title: item.title,
                description: item.description,
                content: item.content,
              },
              lang
            );
            return {
              ...item,
              title: trans.title,
              description: trans.description,
              simplifiedOverview: trans.description,
              simplifiedSummary: {
                simpleOverview: trans.description,
                bulletPoints: [trans.title, trans.description],
                whyItMatters: trans.description,
              },
              content: trans.content,
              language: trans.language,
              isTranslated: trans.isTranslated,
              originalTitle: trans.originalTitle,
              originalDescription: trans.originalDescription,
              originalContent: trans.originalContent,
            };
          } catch {
            return {
              ...item,
              language: 'en',
              isTranslated: false,
            };
          }
        })
      );
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
