import { createHash } from 'crypto';
import { ContentItem } from '@/types/content';
import { generateUnderstandableSummary } from '@/lib/newsSummaryUtils';

export interface NewsApiArticle {
  source?: { id: string | null; name: string };
  author?: string | null;
  title: string;
  description?: string | null;
  url: string;
  urlToImage?: string | null;
  publishedAt: string;
  content?: string | null;
  category?: string;
  simplifiedSummary?: {
    simpleOverview: string;
    bulletPoints: string[];
    whyItMatters: string;
  };
}

export function newsAdapter(
  article: NewsApiArticle,
  fallbackCategory = 'general',
  isDemo = false
): ContentItem {
  // Clean up title: remove trailing source name if present, e.g. "Headline - Source"
  const cleanTitle = article.title
    ? article.title.replace(/\s+-\s+[^-]+$/, '').trim()
    : 'Untitled News';

  const category = (article.category || fallbackCategory).toLowerCase();

  // Create a stable unique ID based on URL or title using SHA-256
  const idSource =
    article.url && !article.url.startsWith('#')
      ? article.url
      : `${cleanTitle}-${article.publishedAt}-${category}-${article.url || ''}`;
  const hash = createHash('sha256').update(idSource).digest('hex').slice(0, 16);
  const id = `news-${hash}`;

  const hashtags = [category, article.source?.name?.toLowerCase().replace(/[^a-z0-9]/g, '')].filter(
    (tag): tag is string => Boolean(tag && tag.length > 1)
  );

  const rawDescription =
    article.description?.trim() ||
    article.content?.split('[+')[0]?.trim() ||
    'Read the full story on the original publication.';
  const rawContent = article.content?.trim() || article.description?.trim() || undefined;

  const simplifiedSummary =
    article.simplifiedSummary ||
    generateUnderstandableSummary(cleanTitle, rawDescription, rawContent, category);

  return {
    id,
    source: 'news',
    title: cleanTitle,
    description: rawDescription,
    content: rawContent,
    simplifiedSummary,
    simplifiedOverview: simplifiedSummary.simpleOverview,
    imageUrl: article.urlToImage || undefined,
    url: article.url || '#',
    category,
    publishedAt: article.publishedAt || new Date().toISOString(),
    author: article.author || article.source?.name || 'News Desk',
    hashtags: Array.from(new Set(hashtags)),
    isDemo,
  };
}

export function mapNewsArticles(
  articles: NewsApiArticle[],
  category = 'general',
  isDemo = false
): ContentItem[] {
  if (!Array.isArray(articles)) return [];
  return articles
    .filter((a) => a && (a.title || a.url))
    .map((a) => newsAdapter(a, category, isDemo));
}
