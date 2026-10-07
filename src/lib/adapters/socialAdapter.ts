import { ContentItem } from '@/types/content';
import { isDateStaleOrHistorical, getDynamicRecentDate } from '@/lib/dateUtils';

export interface SocialAuthor {
  name: string;
  handle: string;
  avatar?: string;
}

export interface SocialPostMetrics {
  likes: number;
  retweets?: number;
  replies?: number;
}

export interface RawSocialPost {
  id: string;
  author: SocialAuthor;
  content: string;
  category?: string;
  hashtags?: string[];
  publishedAt: string;
  metrics?: SocialPostMetrics;
  mediaUrl?: string;
}

export function socialAdapter(post: RawSocialPost, isDemo = false): ContentItem {
  const hashtags = (post.hashtags || []).map((t) => t.replace(/^#/, '').toLowerCase());
  const category = (post.category || hashtags[0] || 'social').toLowerCase();

  return {
    id: post.id.startsWith('social-') ? post.id : `social-${post.id}`,
    source: 'social',
    title: `${post.author.name} (${post.author.handle})`,
    description: post.content,
    imageUrl: post.mediaUrl || post.author.avatar,
    url: 'https://x.com',
    category,
    publishedAt: post.publishedAt || new Date().toISOString(),
    author: `${post.author.name} ${post.author.handle}`,
    hashtags: Array.from(new Set(hashtags)),
    isDemo,
  };
}

export function mapSocialPosts(posts: RawSocialPost[], isDemo = false): ContentItem[] {
  if (!Array.isArray(posts)) return [];
  return posts
    .filter((p) => p && p.author && p.content)
    .map((p, index) => {
      if (isDemo && isDateStaleOrHistorical(p.publishedAt)) {
        return socialAdapter(
          {
            ...p,
            publishedAt: getDynamicRecentDate(index, 5, 16),
          },
          isDemo
        );
      }
      return socialAdapter(p, isDemo);
    });
}

export interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  account: {
    display_name: string;
    acct: string;
    avatar: string;
  };
  media_attachments?: Array<{ url: string }>;
  tags?: Array<{ name: string }>;
  favourites_count?: number;
  reblogs_count?: number;
  replies_count?: number;
}

export function mastodonAdapter(status: MastodonStatus): RawSocialPost {
  const cleanContent = (status.content || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  return {
    id: `masto-${status.id}`,
    author: {
      name: status.account.display_name || status.account.acct,
      handle: `@${status.account.acct}`,
      avatar: status.account.avatar,
    },
    content: cleanContent,
    category: status.tags?.[0]?.name || 'social',
    hashtags: status.tags?.map((t) => t.name) || [],
    publishedAt: status.created_at,
    mediaUrl: status.media_attachments?.[0]?.url,
    metrics: {
      likes: status.favourites_count || 0,
      retweets: status.reblogs_count || 0,
      replies: status.replies_count || 0,
    },
  };
}

export async function fetchLiveMastodonFeed(limit = 10): Promise<RawSocialPost[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://mastodon.social/api/v1/timelines/public?limit=${limit}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FeedPulse/1.0',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = (await res.json()) as MastodonStatus[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((s) => s && s.content && s.account && !s.content.includes('bot'))
      .map(mastodonAdapter);
  } catch {
    return [];
  }
}
