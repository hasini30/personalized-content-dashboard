import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapSocialPosts, RawSocialPost, fetchLiveMastodonFeed } from '@/lib/adapters/socialAdapter';
import socialFixtures from '@/lib/fixtures/socialFixtures.json';
import { semanticSearchFilter } from '@/lib/semanticSearch';

import { globalApiRateLimiter } from '@/lib/rateLimit';
import { getTranslator } from '@/lib/translation';
import { languageCodeSchema } from '@/lib/languages';
import { translateArticleWithEngine } from '@/lib/translation/multilingualEngine';
import { TranslatedArticlePayload } from '@/lib/translation/types';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  hashtag: z.string().optional(),
  q: z.string().optional(),
  lang: languageCodeSchema.default('en'),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`social:${ip}`);
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

    const { page, pageSize, hashtag, q, lang } = parsed.data;

    let posts = [...socialFixtures] as RawSocialPost[];
    try {
      const livePosts = await fetchLiveMastodonFeed(10);
      if (livePosts.length > 0) {
        posts = [...livePosts, ...posts];
      }
    } catch {
      // Keep static fixtures on network failure or sandbox
    }

    if (hashtag && hashtag !== 'all') {
      const tagLower = hashtag.replace(/^#/, '').toLowerCase();
      posts = posts.filter((p) => p.hashtags?.some((t) => t.toLowerCase() === tagLower));
    }

    if (q && q.trim() !== '') {
      posts = semanticSearchFilter(posts, q);
    }
    const total = posts.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = posts.slice(startIndex, startIndex + pageSize);

    let items = mapSocialPosts(paginated, true);

    if (lang !== 'en' && items.length > 0) {
      const translator = getTranslator();
      let translatedPayloads: TranslatedArticlePayload[] = [];

      if (typeof translator.translateArticlesBatch === 'function') {
        try {
          translatedPayloads = await translator.translateArticlesBatch(
            items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description || item.content || '',
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
          return {
            ...item,
            title: trans.title,
            description: trans.description,
            content: trans.content || trans.description,
            simplifiedOverview: trans.description,
            language: trans.language,
            isTranslated: true,
            originalTitle: trans.originalTitle || item.title,
            originalDescription: trans.originalDescription || item.description,
            originalContent: trans.originalContent || item.content,
          };
        }

        try {
          const fallbackTrans = translateArticleWithEngine(
            {
              id: item.id,
              title: item.title,
              description: item.description || item.content || '',
              content: item.content,
            },
            lang
          );
          return {
            ...item,
            title: fallbackTrans.title,
            description: fallbackTrans.description,
            content: fallbackTrans.content || fallbackTrans.description,
            simplifiedOverview: fallbackTrans.description,
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

    const hasMore = page * pageSize < total;

    return NextResponse.json(
      {
        items,
        page,
        pageSize,
        total,
        hasMore,
        isDemo: true,
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
