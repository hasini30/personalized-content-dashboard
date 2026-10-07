import { NewsApiArticle } from '@/lib/adapters/newsAdapter';

export interface GNewsArticle {
  id?: string;
  title: string;
  description: string;
  content: string;
  url: string;
  image?: string;
  publishedAt: string;
  lang?: string;
  source?: {
    id?: string;
    name?: string;
    url?: string;
    country?: string;
  };
}

export interface GNewsResponse {
  totalArticles?: number;
  articles?: GNewsArticle[];
  errors?: string[] | string;
}

export interface FetchGNewsOptions {
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  lang?: string;
  country?: string;
}

export interface GNewsFetchResult {
  articles: NewsApiArticle[];
  total: number;
  isLive: boolean;
}

// In-memory cache to conserve GNews free-tier request quota (10-minute TTL)
const gnewsCache = new Map<string, { result: GNewsFetchResult; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// GNews supported categories mapping
const GNEWS_CATEGORY_MAP: Record<string, string> = {
  general: 'general',
  world: 'world',
  nation: 'nation',
  politics: 'nation',
  business: 'business',
  finance: 'business',
  technology: 'technology',
  entertainment: 'entertainment',
  sports: 'sports',
  science: 'science',
  health: 'health',
  environment: 'science',
  education: 'general',
};

// GNews directly supported ISO languages
const GNEWS_SUPPORTED_LANGS = new Set([
  'ar',
  'zh',
  'nl',
  'en',
  'fr',
  'de',
  'el',
  'he',
  'hi',
  'it',
  'ja',
  'ml',
  'mr',
  'no',
  'pt',
  'ro',
  'ru',
  'es',
  'sv',
  'ta',
  'te',
  'uk',
]);

/**
 * Maps a raw GNews API article into FeedPulse's canonical NewsApiArticle.
 */
export function mapGNewsArticle(gnews: GNewsArticle, defaultCategory = 'general'): NewsApiArticle {
  const sourceName = gnews.source?.name || 'GNews';
  const sourceId = gnews.source?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'gnews';

  return {
    source: {
      id: sourceId,
      name: sourceName,
    },
    author: sourceName,
    title: gnews.title || 'Untitled Headline',
    description: gnews.description || '',
    url: gnews.url || '#',
    urlToImage: gnews.image || null,
    publishedAt: gnews.publishedAt || new Date().toISOString(),
    content: gnews.content || gnews.description || '',
    category: defaultCategory,
  };
}

/**
 * Fetches real-time breaking news from GNews.io API.
 * Returns null if no API key is configured or if the upstream service errors/rate-limits.
 */
export async function fetchFromGNews(
  options: FetchGNewsOptions = {}
): Promise<GNewsFetchResult | null> {
  const apiKey = process.env.GNEWS_API_KEY?.trim() || process.env.NEWS_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const page = Math.max(1, options.page || 1);
  // GNews free tier allows up to 10 articles per page
  const max = Math.min(10, Math.max(1, options.pageSize || 10));
  const q = options.q?.trim();
  const rawCat = (options.category || 'general').toLowerCase();
  const mappedCat = GNEWS_CATEGORY_MAP[rawCat] || 'general';

  // Determine requested language
  const requestedLang = (options.lang || 'en').toLowerCase();
  const gnewsLang = GNEWS_SUPPORTED_LANGS.has(requestedLang) ? requestedLang : 'en';

  const country = options.country || (requestedLang === 'en' ? 'us' : 'in');

  const cacheKey = `${q ? 'search' : 'top'}_${mappedCat}_${q || ''}_${gnewsLang}_${country}_${page}_${max}`;
  const cached = gnewsCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  try {
    const isSearch = Boolean(q && q.length > 0);
    const endpoint = isSearch
      ? 'https://gnews.io/api/v4/search'
      : 'https://gnews.io/api/v4/top-headlines';

    const url = new URL(endpoint);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('lang', gnewsLang);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('max', max.toString());

    if (isSearch && q) {
      url.searchParams.set('q', q);
    } else {
      url.searchParams.set('category', mappedCat);
      url.searchParams.set('country', country);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // 429 Rate Limit, 403 Invalid Key, etc. Fall back smoothly to secondary engines.
      return null;
    }

    const data = (await response.json()) as GNewsResponse;

    if (!data || !Array.isArray(data.articles) || data.articles.length === 0) {
      return null;
    }

    const mappedArticles: NewsApiArticle[] = data.articles.map((art) =>
      mapGNewsArticle(art, rawCat === 'all' ? 'general' : rawCat)
    );

    const result: GNewsFetchResult = {
      articles: mappedArticles,
      total: data.totalArticles || mappedArticles.length,
      isLive: true,
    };

    gnewsCache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
    return result;
  } catch {
    // Network timeouts, DNS failure, or aborted requests fall back gracefully
    return null;
  }
}
