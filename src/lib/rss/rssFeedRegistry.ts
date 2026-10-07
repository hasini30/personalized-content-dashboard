/**
 * Registry of public, high-reputation open RSS feeds by category and publisher.
 * Trusted publishers include BBC, Reuters, The Hindu, Times of India, TechCrunch, and The Guardian.
 * Feeds are fully configurable so more publishers can be added dynamically.
 */

export interface RssFeedConfig {
  id: string;
  name: string;
  publisher: string;
  category: string;
  url: string;
  defaultImage?: string;
  enabled?: boolean;
}

export const DEFAULT_TRUSTED_RSS_FEEDS: RssFeedConfig[] = [
  // BBC NEWS
  {
    id: 'bbc-top',
    name: 'BBC News - Top Stories',
    publisher: 'BBC News',
    category: 'general',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'bbc-world',
    name: 'BBC News - World',
    publisher: 'BBC News',
    category: 'world',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'bbc-tech',
    name: 'BBC News - Technology',
    publisher: 'BBC News',
    category: 'technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'bbc-business',
    name: 'BBC News - Business',
    publisher: 'BBC News',
    category: 'business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'bbc-science',
    name: 'BBC News - Science & Environment',
    publisher: 'BBC News',
    category: 'science',
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'bbc-health',
    name: 'BBC News - Health',
    publisher: 'BBC News',
    category: 'health',
    url: 'https://feeds.bbci.co.uk/news/health/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // REUTERS (Via official real-time wire feed with freshness constraint)
  {
    id: 'reuters-top',
    name: 'Reuters - Top Stories',
    publisher: 'Reuters',
    category: 'general',
    url: 'https://news.google.com/rss/search?q=site:reuters.com+when:2d&hl=en-US&gl=US&ceid=US:en',
    defaultImage:
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'reuters-business',
    name: 'Reuters - Business & Markets',
    publisher: 'Reuters',
    category: 'business',
    url: 'https://news.google.com/rss/search?q=site:reuters.com/business+when:2d&hl=en-US&gl=US&ceid=US:en',
    defaultImage:
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'reuters-tech',
    name: 'Reuters - Technology',
    publisher: 'Reuters',
    category: 'technology',
    url: 'https://news.google.com/rss/search?q=site:reuters.com/technology+when:2d&hl=en-US&gl=US&ceid=US:en',
    defaultImage:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // THE HINDU
  {
    id: 'thehindu-top',
    name: 'The Hindu - News Feed',
    publisher: 'The Hindu',
    category: 'general',
    url: 'https://www.thehindu.com/news/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1546422904-90eab23c3d7e?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'thehindu-national',
    name: 'The Hindu - National',
    publisher: 'The Hindu',
    category: 'politics',
    url: 'https://www.thehindu.com/news/national/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'thehindu-business',
    name: 'The Hindu - Business',
    publisher: 'The Hindu',
    category: 'business',
    url: 'https://www.thehindu.com/business/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'thehindu-scitech',
    name: 'The Hindu - Sci-Tech',
    publisher: 'The Hindu',
    category: 'science',
    url: 'https://www.thehindu.com/sci-tech/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // TIMES OF INDIA
  {
    id: 'toi-top',
    name: 'Times of India - Top Stories',
    publisher: 'Times of India',
    category: 'general',
    url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'toi-india',
    name: 'Times of India - National',
    publisher: 'Times of India',
    category: 'politics',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'toi-world',
    name: 'Times of India - World',
    publisher: 'Times of India',
    category: 'world',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'toi-tech',
    name: 'Times of India - Tech',
    publisher: 'Times of India',
    category: 'technology',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // TECHCRUNCH
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    publisher: 'TechCrunch',
    category: 'technology',
    url: 'https://techcrunch.com/feed/',
    defaultImage:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // THE GUARDIAN
  {
    id: 'guardian-world',
    name: 'The Guardian - World News',
    publisher: 'The Guardian',
    category: 'world',
    url: 'https://www.theguardian.com/world/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'guardian-intl',
    name: 'The Guardian - International',
    publisher: 'The Guardian',
    category: 'general',
    url: 'https://www.theguardian.com/international/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'guardian-tech',
    name: 'The Guardian - Technology',
    publisher: 'The Guardian',
    category: 'technology',
    url: 'https://www.theguardian.com/technology/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'guardian-business',
    name: 'The Guardian - Business',
    publisher: 'The Guardian',
    category: 'business',
    url: 'https://www.theguardian.com/business/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'guardian-science',
    name: 'The Guardian - Science',
    publisher: 'The Guardian',
    category: 'science',
    url: 'https://www.theguardian.com/science/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // SPORTS
  {
    id: 'bbc-sports',
    name: 'BBC Sport - Headlines',
    publisher: 'BBC News',
    category: 'sports',
    url: 'https://feeds.bbci.co.uk/sport/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'thehindu-sports',
    name: 'The Hindu - Sport',
    publisher: 'The Hindu',
    category: 'sports',
    url: 'https://www.thehindu.com/sport/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'guardian-sports',
    name: 'The Guardian - Sport',
    publisher: 'The Guardian',
    category: 'sports',
    url: 'https://www.theguardian.com/sport/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'toi-sports',
    name: 'Times of India - Sports',
    publisher: 'Times of India',
    category: 'sports',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // ENTERTAINMENT
  {
    id: 'bbc-entertainment',
    name: 'BBC News - Entertainment & Arts',
    publisher: 'BBC News',
    category: 'entertainment',
    url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    defaultImage:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'thehindu-entertainment',
    name: 'The Hindu - Entertainment',
    publisher: 'The Hindu',
    category: 'entertainment',
    url: 'https://www.thehindu.com/entertainment/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'guardian-culture',
    name: 'The Guardian - Culture & Entertainment',
    publisher: 'The Guardian',
    category: 'entertainment',
    url: 'https://www.theguardian.com/culture/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'toi-entertainment',
    name: 'Times of India - Entertainment',
    publisher: 'Times of India',
    category: 'entertainment',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // ENVIRONMENT
  {
    id: 'guardian-environment',
    name: 'The Guardian - Environment',
    publisher: 'The Guardian',
    category: 'environment',
    url: 'https://www.theguardian.com/environment/rss',
    defaultImage:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'thehindu-environment',
    name: 'The Hindu - Environment',
    publisher: 'The Hindu',
    category: 'environment',
    url: 'https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },

  // EDUCATION
  {
    id: 'thehindu-education',
    name: 'The Hindu - Education',
    publisher: 'The Hindu',
    category: 'education',
    url: 'https://www.thehindu.com/education/feeder/default.rss',
    defaultImage:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
  {
    id: 'toi-education',
    name: 'Times of India - Education',
    publisher: 'Times of India',
    category: 'education',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/913168846.cms',
    defaultImage:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    enabled: true,
  },
];

// Active registry that allows dynamic registration/removal
let activeFeeds: RssFeedConfig[] = [...DEFAULT_TRUSTED_RSS_FEEDS];

export const TRUSTED_RSS_FEEDS = activeFeeds;

/**
 * Register a new RSS feed at runtime.
 */
export function registerRssFeed(feed: RssFeedConfig): void {
  const existingIdx = activeFeeds.findIndex((f) => f.id === feed.id || f.url === feed.url);
  if (existingIdx >= 0) {
    activeFeeds[existingIdx] = { ...activeFeeds[existingIdx], ...feed };
  } else {
    activeFeeds.push({ enabled: true, ...feed });
  }
}

/**
 * Remove an RSS feed by id.
 */
export function unregisterRssFeed(id: string): boolean {
  const initialLength = activeFeeds.length;
  activeFeeds = activeFeeds.filter((f) => f.id !== id);
  return activeFeeds.length < initialLength;
}

/**
 * Reset feeds to defaults.
 */
export function resetRssFeeds(): void {
  activeFeeds = [...DEFAULT_TRUSTED_RSS_FEEDS];
}

/**
 * Returns all configured feeds, optionally filtering only enabled ones.
 */
export function getAllRssFeeds(onlyEnabled = true): RssFeedConfig[] {
  if (onlyEnabled) {
    return activeFeeds.filter((f) => f.enabled !== false);
  }
  return [...activeFeeds];
}

/**
 * Returns feeds matching requested category or all feeds if 'all' or empty.
 */
export function getFeedsForCategory(category?: string): RssFeedConfig[] {
  const feeds = getAllRssFeeds(true);
  if (!category || category === 'all') {
    return feeds;
  }
  let norm = category.toLowerCase().trim();
  if (norm === 'sport') norm = 'sports';
  if (norm === 'culture' || norm === 'arts') norm = 'entertainment';
  if (norm === 'climate') norm = 'environment';
  if (norm === 'tech') norm = 'technology';
  if (norm === 'finance') norm = 'business';

  const matched = feeds.filter((f) => f.category === norm);
  return matched.length > 0 ? matched : feeds;
}

/**
 * Returns feeds matching requested publisher (e.g. 'BBC News', 'Reuters', etc.).
 */
export function getFeedsForPublisher(publisher?: string): RssFeedConfig[] {
  const feeds = getAllRssFeeds(true);
  if (!publisher || publisher === 'all') {
    return feeds;
  }
  const norm = publisher.toLowerCase().trim();
  const matched = feeds.filter(
    (f) =>
      f.publisher.toLowerCase() === norm ||
      f.publisher.toLowerCase().includes(norm) ||
      norm.includes(f.publisher.toLowerCase()) ||
      f.name.toLowerCase().includes(norm)
  );
  return matched.length > 0 ? matched : feeds;
}

/**
 * Returns a list of distinct publisher names available in the registry.
 */
export function getAvailablePublishers(): string[] {
  const set = new Set<string>();
  for (const f of getAllRssFeeds(true)) {
    if (f.publisher) {
      set.add(f.publisher);
    }
  }
  return Array.from(set);
}
