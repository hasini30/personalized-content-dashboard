import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapNewsArticles } from '@/lib/adapters/newsAdapter';
import { mapTmdbMovies, TmdbMovie } from '@/lib/adapters/tmdbAdapter';
import { mapSocialPosts, RawSocialPost } from '@/lib/adapters/socialAdapter';
import movieFixtures from '@/lib/fixtures/movieFixtures.json';
import socialFixtures from '@/lib/fixtures/socialFixtures.json';
import { semanticSearchFilter } from '@/lib/semanticSearch';
import { globalApiRateLimiter } from '@/lib/rateLimit';
import { languageCodeSchema } from '@/lib/languages';
import { getTranslator } from '@/lib/translation';
import { getCuratedMasterCatalog } from '@/lib/newsEngine';
import { ContentItem } from '@/types/content';
import { interleaveAndDeduplicate } from '@/lib/feedUtils';

const querySchema = z.object({
  q: z.string().min(1),
  type: z.enum(['all', 'news', 'movie', 'social']).default('all'),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  lang: languageCodeSchema.default('en'),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = globalApiRateLimiter.check(`search:${ip}`);
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

    const { q, type, category, page, pageSize, lang } = parsed.data;

    let newsMatches: ContentItem[] = [];
    let movieMatches: ContentItem[] = [];
    let socialMatches: ContentItem[] = [];

    // Search News (ignores preferences, searches entire catalogue)
    if (type === 'all' || type === 'news') {
      let filteredNews = getCuratedMasterCatalog();
      if (category && category !== 'all') {
        filteredNews = filteredNews.filter(
          (item) => item.category?.toLowerCase() === category.toLowerCase()
        );
      }
      filteredNews = semanticSearchFilter(filteredNews, q);
      newsMatches = mapNewsArticles(filteredNews, category || 'general', true);

      // Translate news if requested language is not English
      if (lang !== 'en') {
        const translator = getTranslator();
        newsMatches = await Promise.all(
          newsMatches.map(async (item) => {
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
    }

    // Search Movies
    if (type === 'all' || type === 'movie') {
      let filteredMovies = [...movieFixtures] as TmdbMovie[];
      if (category && category !== 'all') {
        const catLower = category.toLowerCase();
        filteredMovies = filteredMovies.filter((m) => {
          if (Array.isArray(m.genres)) {
            return m.genres.some((g) =>
              (typeof g === 'string' ? g : g.name).toLowerCase().includes(catLower)
            );
          }
          return true;
        });
      }
      filteredMovies = semanticSearchFilter(filteredMovies, q);
      movieMatches = mapTmdbMovies(filteredMovies, true);
    }

    // Search Social
    if (type === 'all' || type === 'social') {
      let filteredSocial = [...socialFixtures] as RawSocialPost[];
      if (category && category !== 'all') {
        const catLower = category.toLowerCase();
        filteredSocial = filteredSocial.filter((p) =>
          p.hashtags?.some((t) => t.toLowerCase() === catLower)
        );
      }
      filteredSocial = semanticSearchFilter(filteredSocial, q);
      socialMatches = mapSocialPosts(filteredSocial, true);
    }

    // Combine results based on type filter
    let combined: ContentItem[] = [];
    if (type === 'news') {
      combined = newsMatches;
    } else if (type === 'movie') {
      combined = movieMatches;
    } else if (type === 'social') {
      combined = socialMatches;
    } else {
      combined = interleaveAndDeduplicate(newsMatches, movieMatches, socialMatches);
    }

    const total = combined.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = combined.slice(startIndex, startIndex + pageSize);
    const hasMore = page * pageSize < total;

    return NextResponse.json(
      {
        items: paginatedItems,
        page,
        pageSize,
        total,
        hasMore,
        isDemo: true,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
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
