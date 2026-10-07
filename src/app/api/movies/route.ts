import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapTmdbMovies, TmdbMovie } from '@/lib/adapters/tmdbAdapter';
import movieFixtures from '@/lib/fixtures/movieFixtures.json';
import { semanticSearchFilter } from '@/lib/semanticSearch';

import { globalApiRateLimiter } from '@/lib/rateLimit';
import { getTranslator } from '@/lib/translation';
import { languageCodeSchema } from '@/lib/languages';
import { translateArticleWithEngine } from '@/lib/translation/multilingualEngine';
import { TranslatedArticlePayload } from '@/lib/translation/types';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  genre: z.string().optional(),
  trending: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => val === 'true' || val === '1'),
  q: z.string().optional(),
  lang: languageCodeSchema.default('en'),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`movies:${ip}`);
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

    const { page, pageSize, genre, trending, q, lang } = parsed.data;
    const apiKey = process.env.TMDB_API_KEY;

    let movies: TmdbMovie[] = [];
    let isDemo = false;
    let total = 0;

    if (apiKey && apiKey.trim() !== '') {
      try {
        let endpoint = 'https://api.themoviedb.org/3/discover/movie';
        const url = new URL(endpoint);

        if (q) {
          endpoint = 'https://api.themoviedb.org/3/search/movie';
          url.href = endpoint;
          url.searchParams.set('query', q);
        } else if (trending) {
          endpoint = 'https://api.themoviedb.org/3/trending/movie/week';
          url.href = endpoint;
        }

        url.searchParams.set('page', page.toString());
        url.searchParams.set('include_adult', 'false');

        const headers: Record<string, string> = {
          Accept: 'application/json',
        };

        if (apiKey.startsWith('ey')) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          url.searchParams.set('api_key', apiKey);
        }

        const upstreamRes = await fetch(url.toString(), {
          headers,
          next: { revalidate: 3600 },
        });

        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          if (Array.isArray(data.results)) {
            movies = data.results;
            total = data.total_results || data.results.length;
          } else {
            isDemo = true;
          }
        } else {
          isDemo = true;
        }
      } catch {
        isDemo = true;
      }
    } else {
      isDemo = true;
    }

    // Mock Fallback
    if (isDemo || movies.length === 0) {
      isDemo = true;
      let filtered = [...movieFixtures] as TmdbMovie[];

      if (genre && genre !== 'all') {
        const targetGenres = genre
          .toLowerCase()
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean);

        if (targetGenres.length > 0) {
          filtered = filtered.filter((m) => {
            if (Array.isArray(m.genres)) {
              return m.genres.some((g) => {
                const gName = (typeof g === 'string' ? g : g.name).toLowerCase();
                return targetGenres.some((tg) => gName.includes(tg));
              });
            }
            return true;
          });
        }
      }

      if (q && q.trim() !== '') {
        filtered = semanticSearchFilter(filtered, q);
      }
      total = filtered.length;
      const startIndex = (page - 1) * pageSize;
      movies = filtered.slice(startIndex, startIndex + pageSize);
    }

    let items = mapTmdbMovies(movies, isDemo);

    if (lang !== 'en' && items.length > 0) {
      const translator = getTranslator();
      let translatedPayloads: TranslatedArticlePayload[] = [];

      if (typeof translator.translateArticlesBatch === 'function') {
        try {
          translatedPayloads = await translator.translateArticlesBatch(
            items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description || '',
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
            simplifiedOverview: trans.description,
            language: trans.language,
            isTranslated: true,
            originalTitle: trans.originalTitle || item.title,
            originalDescription: trans.originalDescription || item.description,
          };
        }

        try {
          const fallbackTrans = translateArticleWithEngine(
            {
              id: item.id,
              title: item.title,
              description: item.description || '',
              content: item.content,
            },
            lang
          );
          return {
            ...item,
            title: fallbackTrans.title,
            description: fallbackTrans.description,
            simplifiedOverview: fallbackTrans.description,
            language: fallbackTrans.language,
            isTranslated: true,
            originalTitle: item.title,
            originalDescription: item.description,
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
        isDemo,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
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
