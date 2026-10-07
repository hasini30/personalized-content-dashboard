import { ContentItem } from '@/types/content';

/**
 * Normalizes an article title for reliable deduplication across syndicated outlets.
 * Strips publisher suffixes (' - CNN', ' | BBC'), update phases, years, punctuation, and extra whitespace.
 */
export function normalizeTitleForDeduplication(title?: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\s+[-|–—]\s+[^-|–—]+$/, '') // Remove trailing publisher names
    .replace(/\(phase\s+\d+[^)]*\)/gi, '') // Remove phase suffixes
    .replace(/\(\d{4}\)/g, '') // Remove release years
    .replace(/[^a-z0-9]/g, '') // Keep only alphanumeric characters
    .trim();
}

/**
 * Normalizes URLs by removing tracking query parameters (utm_*, ref, etc.) and trailing slashes.
 */
export function normalizeUrlForDeduplication(url?: string): string {
  if (!url || url === '#' || url.startsWith('javascript:')) return '';
  try {
    const parsed = new URL(url);
    // Strip common tracking and session parameters
    const stripParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'source',
      'fbclid',
      'gclid',
    ];
    stripParams.forEach((p) => parsed.searchParams.delete(p));
    const search = parsed.searchParams.toString();
    const cleanSearch = search ? `?${search}` : '';
    return `${parsed.hostname}${parsed.pathname}${cleanSearch}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.split('?')[0].replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Validates whether a URL is a genuine, reachable external web address.
 * Rejects undefined, hashes, internal demo flags, and dummy/unreachable domains (e.g. globalwire.org, example.com).
 */
export function isValidExternalUrl(url?: string, isDemo?: boolean): boolean {
  if (!url || url === '#' || isDemo) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname.includes('globalwire.org') ||
      hostname.includes('example.com') ||
      hostname.includes('localhost') ||
      hostname === 'test.com' ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if two headlines represent the exact same story or near-duplicate syndicated coverage.
 */
export function areTitlesNearDuplicates(titleA: string, titleB: string): boolean {
  const normA = normalizeTitleForDeduplication(titleA);
  const normB = normalizeTitleForDeduplication(titleB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Substring containment when one title is largely contained in another (min 20 alphanumeric chars)
  if (normA.length >= 20 && normB.length >= 20) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }

  // Token Jaccard similarity across significant words (>2 characters)
  const wordsA = new Set(
    titleA
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const wordsB = new Set(
    titleB
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  // Require at least 3 significant words on each side and at least 3 shared words to avoid false positives
  if (wordsA.size < 3 || wordsB.size < 3) return false;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  if (intersection < 3) return false;

  const union = new Set([...wordsA, ...wordsB]).size;
  const jaccard = intersection / union;
  return jaccard >= 0.6;
}

/**
 * Deduplicates an array of ContentItems by ID, normalized URL, normalized title, and near-duplicate headlines.
 */
export function deduplicateContentItems(items: ContentItem[] = []): ContentItem[] {
  const result: ContentItem[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const seenNormTitles = new Set<string>();
  const seenRawTitles: string[] = [];

  for (const item of items) {
    if (!item) continue;

    // 1. Exact ID check
    if (item.id && seenIds.has(item.id)) {
      continue;
    }

    // 2. Normalized URL check
    const normUrl = normalizeUrlForDeduplication(item.url);
    if (normUrl && seenUrls.has(normUrl)) {
      continue;
    }

    // 3. Normalized Title & Near-Duplicate check with multi-source coverage aggregation
    const normTitle = normalizeTitleForDeduplication(item.title);
    const existingMatch = result.find(
      (r) =>
        (normTitle && normalizeTitleForDeduplication(r.title) === normTitle) ||
        areTitlesNearDuplicates(r.title, item.title)
    );

    if (existingMatch) {
      // If from a different publisher/source and distinct URL, attach as related source coverage
      const sourceName = item.author || (item.source === 'news' ? 'Another Source' : undefined);
      if (
        sourceName &&
        existingMatch.author &&
        sourceName.toLowerCase() !== existingMatch.author.toLowerCase() &&
        item.url &&
        item.url !== '#' &&
        item.url !== existingMatch.url
      ) {
        if (!existingMatch.relatedSources) {
          existingMatch.relatedSources = [];
        }
        if (
          !existingMatch.relatedSources.some((s) => s.name === sourceName || s.url === item.url)
        ) {
          existingMatch.relatedSources.push({
            name: sourceName,
            url: item.url,
          });
        }
      }
      continue;
    }

    // Register this item as seen
    if (item.id) seenIds.add(item.id);
    if (normUrl) seenUrls.add(normUrl);
    if (normTitle) seenNormTitles.add(normTitle);
    if (item.title) seenRawTitles.push(item.title);

    result.push(item);
  }

  return result;
}

/**
 * Interleave arrays of items from different sources and deduplicate by ID, URL, and title.
 */
export function interleaveAndDeduplicate(
  news: ContentItem[] = [],
  movies: ContentItem[] = [],
  social: ContentItem[] = [],
  audio: ContentItem[] = []
): ContentItem[] {
  const combinedRoundRobin: ContentItem[] = [];
  const maxLen = Math.max(news.length, movies.length, social.length, audio.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < news.length) combinedRoundRobin.push(news[i]);
    if (i < movies.length) combinedRoundRobin.push(movies[i]);
    if (i < social.length) combinedRoundRobin.push(social[i]);
    if (i < audio.length) combinedRoundRobin.push(audio[i]);
  }

  return deduplicateContentItems(combinedRoundRobin);
}

/**
 * Apply custom user ordering from dnd-kit.
 * Items in customOrder appear in that explicit order; newly discovered items are appended.
 */
export function applyCustomOrder(items: ContentItem[], customOrder: string[]): ContentItem[] {
  if (!customOrder || customOrder.length === 0) {
    return items;
  }

  const itemMap = new Map<string, ContentItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  const ordered: ContentItem[] = [];
  const processedIds = new Set<string>();

  // Add items specified in custom order
  for (const id of customOrder) {
    const item = itemMap.get(id);
    if (item) {
      ordered.push(item);
      processedIds.add(id);
    }
  }

  // Append remaining items in their natural order
  for (const item of items) {
    if (!processedIds.has(item.id)) {
      ordered.push(item);
    }
  }

  return ordered;
}

/**
 * Ranks items personalizing by preferred categories, followed publishers, and reading history.
 * Boosts preferred categories and followed publishers while keeping unread stories fresh.
 */
export function rankPersonalizedItems(
  items: ContentItem[],
  options: {
    preferredCategories?: string[];
    followedPublishers?: string[];
    readItemIds?: string[];
  } = {}
): ContentItem[] {
  const preferredSet = new Set((options.preferredCategories || []).map((c) => c.toLowerCase()));
  const publishersSet = new Set((options.followedPublishers || []).map((p) => p.toLowerCase()));
  const readSet = new Set(options.readItemIds || []);

  return [...items].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Category match bonus
    if (preferredSet.has(a.category.toLowerCase())) scoreA += 10;
    if (preferredSet.has(b.category.toLowerCase())) scoreB += 10;

    // Followed publisher bonus
    if (a.author && publishersSet.has(a.author.toLowerCase())) scoreA += 15;
    if (b.author && publishersSet.has(b.author.toLowerCase())) scoreB += 15;

    // Breaking / Live news bonus
    if (a.isLive || a.isBreaking) scoreA += 20;
    if (b.isLive || b.isBreaking) scoreB += 20;

    // Slight penalty if already read so fresh unread news surfaces first
    if (readSet.has(a.id)) scoreA -= 5;
    if (readSet.has(b.id)) scoreB -= 5;

    // Primary sort by score DESC
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // Secondary sort by publication date DESC
    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });
}
