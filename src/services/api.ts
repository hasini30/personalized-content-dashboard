import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ContentItem, PaginatedResponse, UnderstandableSummary } from '@/types/content';
import { deduplicateContentItems } from '@/lib/feedUtils';

function mergePaginatedItems(
  currentCache: PaginatedResponse<ContentItem>,
  newItems: PaginatedResponse<ContentItem>,
  page: number
): PaginatedResponse<ContentItem> {
  if (page === 1) {
    const deduped = deduplicateContentItems(newItems.items);
    currentCache.items = deduped;
    currentCache.page = newItems.page;
    currentCache.hasMore = newItems.hasMore;
    currentCache.total = newItems.total;
    currentCache.isDemo = newItems.isDemo;
    return currentCache;
  }

  const existingCount = currentCache.items.length;
  const merged = deduplicateContentItems([...currentCache.items, ...newItems.items]);
  const addedCount = merged.length - existingCount;

  currentCache.items = merged;
  currentCache.page = newItems.page;
  currentCache.total = newItems.total;
  currentCache.isDemo = newItems.isDemo;
  // Stop infinite scroll if no new unique items were appended
  currentCache.hasMore = addedCount > 0 && Boolean(newItems.hasMore);
  return currentCache;
}

export interface NewsQueryParams {
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  country?: string;
  sources?: string;
  scope?: 'preferred' | 'all';
  preferredCategories?: string;
  lang?: string;
}

export interface TrendingQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  preferredCategories?: string;
  lang?: string;
}

export interface MoviesQueryParams {
  genre?: string;
  trending?: boolean;
  q?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
}

export interface SocialQueryParams {
  hashtag?: string;
  q?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchQueryParams {
  q: string;
  type?: 'all' | 'news' | 'movie' | 'social';
  category?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
}

export interface ArticleSummaryParams {
  id: string;
  lang?: string;
  title?: string;
  description?: string;
  content?: string;
  category?: string;
}

export interface ArticleSummaryResponse {
  id: string;
  lang: string;
  summary: UnderstandableSummary;
  modelUsed?: string;
  isFallback?: boolean;
  isGrounded?: boolean;
  groundingScore?: number;
  error?: string;
}

export interface RssQueryParams {
  cursor?: string;
  limit?: number;
  category?: string;
  source?: string;
  q?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
  sync?: string;
}

export interface RssPaginatedResponse {
  items: ContentItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  total: number;
  page?: number;
  pageSize?: number;
  sources: string[];
  isRssLive: boolean;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl:
      typeof window === 'undefined' || process.env.NODE_ENV === 'test'
        ? 'http://localhost:3000/api'
        : '/api',
    fetchFn: (input, init) => fetch(input, init),
  }),
  tagTypes: ['News', 'Movies', 'Social', 'Feed', 'Rss'],
  endpoints: (builder) => ({
    getNews: builder.query<PaginatedResponse<ContentItem>, NewsQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.category) queryParams.set('category', params.category);
        if (params?.q) queryParams.set('q', params.q);
        if (params?.country) queryParams.set('country', params.country);
        if (params?.sources) queryParams.set('sources', params.sources);
        if (params?.scope) queryParams.set('scope', params.scope);
        if (params?.preferredCategories)
          queryParams.set('preferredCategories', params.preferredCategories);
        if (params?.lang) queryParams.set('lang', params.lang);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
        return `/news?${queryParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const category = queryArgs?.category || 'all';
        const sources = queryArgs?.sources || 'all';
        const q = queryArgs?.q || '';
        const lang = queryArgs?.lang || 'en';
        const scope = queryArgs?.scope || 'all';
        const pref = queryArgs?.preferredCategories || '';
        return `${endpointName}(${category}_${sources}_${q}_${lang}_${scope}_${pref})`;
      },
      merge: (currentCache, newItems, { arg }) => {
        return mergePaginatedItems(currentCache, newItems, arg?.page || 1);
      },
      forceRefetch({ currentArg, previousArg }) {
        return (
          currentArg?.page !== previousArg?.page ||
          currentArg?.category !== previousArg?.category ||
          currentArg?.sources !== previousArg?.sources ||
          currentArg?.q !== previousArg?.q ||
          currentArg?.lang !== previousArg?.lang
        );
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'News' as const, id })),
              { type: 'News', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'News', id: 'PARTIAL-LIST' }],
    }),

    getTrending: builder.query<PaginatedResponse<ContentItem>, TrendingQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.category) queryParams.set('category', params.category);
        if (params?.preferredCategories)
          queryParams.set('preferredCategories', params.preferredCategories);
        if (params?.lang) queryParams.set('lang', params.lang);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
        return `/trending?${queryParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const category = queryArgs?.category || 'all';
        const lang = queryArgs?.lang || 'en';
        const pref = queryArgs?.preferredCategories || '';
        return `${endpointName}(${category}_${lang}_${pref})`;
      },
      merge: (currentCache, newItems, { arg }) => {
        return mergePaginatedItems(currentCache, newItems, arg?.page || 1);
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'News' as const, id })),
              { type: 'News', id: 'TRENDING-LIST' },
            ]
          : [{ type: 'News', id: 'TRENDING-LIST' }],
    }),

    getArticleSummary: builder.query<ArticleSummaryResponse, ArticleSummaryParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.lang) queryParams.set('lang', params.lang);
        return {
          url: `/article/${encodeURIComponent(params.id)}?${queryParams.toString()}`,
          method: 'POST',
          body: {
            title: params.title,
            description: params.description,
            content: params.content,
            category: params.category,
          },
        };
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}(${queryArgs.id}_${queryArgs.lang || 'en'})`;
      },
      providesTags: (_result, _error, arg) => [{ type: 'News', id: `SUMMARY-${arg.id}` }],
    }),

    getMovies: builder.query<PaginatedResponse<ContentItem>, MoviesQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.genre) queryParams.set('genre', params.genre);
        if (params?.trending) queryParams.set('trending', 'true');
        if (params?.q) queryParams.set('q', params.q);
        if (params?.lang) queryParams.set('lang', params.lang);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
        return `/movies?${queryParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const genre = queryArgs?.genre || 'all';
        const trending = queryArgs?.trending ? 'trending' : 'discover';
        const q = queryArgs?.q || '';
        const lang = queryArgs?.lang || 'en';
        return `${endpointName}(${genre}_${trending}_${q}_${lang})`;
      },
      merge: (currentCache, newItems, { arg }) => {
        return mergePaginatedItems(currentCache, newItems, arg?.page || 1);
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Movies' as const, id })),
              { type: 'Movies', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Movies', id: 'PARTIAL-LIST' }],
    }),

    getSocial: builder.query<PaginatedResponse<ContentItem>, SocialQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.hashtag) queryParams.set('hashtag', params.hashtag);
        if (params?.q) queryParams.set('q', params.q);
        if (params?.lang) queryParams.set('lang', params.lang);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
        return `/social?${queryParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const hashtag = queryArgs?.hashtag || 'all';
        const q = queryArgs?.q || '';
        const lang = queryArgs?.lang || 'en';
        return `${endpointName}(${hashtag}_${q}_${lang})`;
      },
      merge: (currentCache, newItems, { arg }) => {
        return mergePaginatedItems(currentCache, newItems, arg?.page || 1);
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Social' as const, id })),
              { type: 'Social', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Social', id: 'PARTIAL-LIST' }],
    }),

    getSearch: builder.query<PaginatedResponse<ContentItem>, SearchQueryParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        queryParams.set('q', params.q);
        if (params.type) queryParams.set('type', params.type);
        if (params.category) queryParams.set('category', params.category);
        if (params.lang) queryParams.set('lang', params.lang);
        if (params.page) queryParams.set('page', params.page.toString());
        if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
        return `/search?${queryParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const q = queryArgs.q;
        const type = queryArgs.type || 'all';
        const category = queryArgs.category || 'all';
        const lang = queryArgs.lang || 'en';
        return `${endpointName}(${q}_${type}_${category}_${lang})`;
      },
      merge: (currentCache, newItems, { arg }) => {
        const page = arg?.page || 1;
        if (page === 1) {
          return newItems;
        }
        const existingIds = new Set(currentCache.items.map((i) => i.id));
        const filteredNew = newItems.items.filter((i) => !existingIds.has(i.id));
        currentCache.items.push(...filteredNew);
        currentCache.page = newItems.page;
        currentCache.hasMore = newItems.hasMore;
        currentCache.total = newItems.total;
        currentCache.isDemo = newItems.isDemo;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
      providesTags: [{ type: 'Feed', id: 'SEARCH-LIST' }],
    }),

    getRssFeed: builder.query<RssPaginatedResponse, RssQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.cursor) queryParams.set('cursor', params.cursor);
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
        if (params?.category) queryParams.set('category', params.category);
        if (params?.source) queryParams.set('source', params.source);
        if (params?.q) queryParams.set('q', params.q);
        if (params?.lang) queryParams.set('lang', params.lang);
        if (params?.sync) queryParams.set('sync', params.sync);
        return `/rss?${queryParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const category = queryArgs?.category || 'all';
        const source = queryArgs?.source || 'all';
        const q = queryArgs?.q || '';
        const lang = queryArgs?.lang || 'en';
        return `${endpointName}(${category}_${source}_${q}_${lang})`;
      },
      merge: (currentCache, newItems, { arg }) => {
        const isFirstPage = !arg?.cursor && (!arg?.page || arg?.page === 1);
        if (isFirstPage) {
          const deduped = deduplicateContentItems(newItems.items);
          currentCache.items = deduped;
          currentCache.nextCursor = newItems.nextCursor;
          currentCache.hasMore = newItems.hasMore;
          currentCache.total = newItems.total;
          currentCache.sources = newItems.sources;
          currentCache.isRssLive = newItems.isRssLive;
          return currentCache;
        }

        const existingCount = currentCache.items.length;
        const merged = deduplicateContentItems([...currentCache.items, ...newItems.items]);
        const addedCount = merged.length - existingCount;

        currentCache.items = merged;
        currentCache.nextCursor = newItems.nextCursor;
        currentCache.total = newItems.total;
        currentCache.sources = newItems.sources;
        currentCache.isRssLive = newItems.isRssLive;
        currentCache.hasMore = addedCount > 0 && Boolean(newItems.hasMore);
        return currentCache;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.cursor !== previousArg?.cursor || currentArg?.page !== previousArg?.page;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Rss' as const, id })),
              { type: 'Rss', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Rss', id: 'PARTIAL-LIST' }],
    }),
  }),
});

export const {
  useGetNewsQuery,
  useLazyGetNewsQuery,
  useGetTrendingQuery,
  useLazyGetTrendingQuery,
  useGetArticleSummaryQuery,
  useLazyGetArticleSummaryQuery,
  useGetMoviesQuery,
  useLazyGetMoviesQuery,
  useGetSocialQuery,
  useLazyGetSocialQuery,
  useGetSearchQuery,
  useLazyGetSearchQuery,
  useGetRssFeedQuery,
  useLazyGetRssFeedQuery,
} = apiSlice;
