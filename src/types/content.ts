export type ContentSource = 'news' | 'movie' | 'social';

export type UnderstandableSummary = {
  simpleOverview: string;
  bulletPoints: string[];
  whyItMatters: string;
};

export type ContentItem = {
  id: string;
  source: ContentSource;
  title: string;
  description: string;
  content?: string;
  simplifiedOverview?: string;
  simplifiedSummary?: UnderstandableSummary;
  imageUrl?: string;
  url: string;
  category: string;
  publishedAt: string;
  author?: string;
  hashtags?: string[];
  isDemo?: boolean;
  isPreferred?: boolean;
  language?: string;
  isTranslated?: boolean;
  originalTitle?: string;
  originalDescription?: string;
  originalContent?: string;
  audioUrl?: string;
  duration?: number;
  trackArtist?: string;
  isLive?: boolean;
  isBreaking?: boolean;
  isUpdated?: boolean;
  updatedAt?: string;
  relatedSources?: Array<{
    name: string;
    url: string;
  }>;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total?: number;
  hasMore: boolean;
  isDemo?: boolean;
};
