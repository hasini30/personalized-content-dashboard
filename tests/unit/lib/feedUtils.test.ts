import { interleaveAndDeduplicate, applyCustomOrder, isValidExternalUrl } from '@/lib/feedUtils';
import { ContentItem } from '@/types/content';

describe('feedUtils', () => {
  const createMockItem = (id: string, source: 'news' | 'movie' | 'social'): ContentItem => ({
    id,
    source,
    title: `Title ${id}`,
    description: `Description ${id}`,
    url: `https://example.com/${id}`,
    category: 'general',
    publishedAt: '2026-03-03T12:00:00Z',
  });

  describe('isValidExternalUrl', () => {
    it('returns false for undefined, empty, or hash URLs', () => {
      expect(isValidExternalUrl(undefined)).toBe(false);
      expect(isValidExternalUrl('')).toBe(false);
      expect(isValidExternalUrl('#')).toBe(false);
    });

    it('returns false if item is marked as demo', () => {
      expect(isValidExternalUrl('https://www.bbc.com/news/world', true)).toBe(false);
      expect(isValidExternalUrl('https://techcrunch.com/article', true)).toBe(false);
    });

    it('returns false for dummy, unreachable, or local test domains', () => {
      expect(
        isValidExternalUrl('https://news.globalwire.org/technology/quantum-advantage-benchmark')
      ).toBe(false);
      expect(isValidExternalUrl('https://social.example.com/status/stream-101')).toBe(false);
      expect(isValidExternalUrl('http://localhost:3000/feed')).toBe(false);
      expect(isValidExternalUrl('http://test.com/news')).toBe(false);
      expect(isValidExternalUrl('http://myserver.local/news')).toBe(false);
    });

    it('returns false for non-HTTP/HTTPS protocols', () => {
      expect(isValidExternalUrl('javascript:void(0)')).toBe(false);
      expect(isValidExternalUrl('ftp://files.example.org')).toBe(false);
    });

    it('returns true for genuine, live publisher URLs', () => {
      expect(isValidExternalUrl('https://www.bbc.com/news/articles/c049j511zldo')).toBe(true);
      expect(isValidExternalUrl('https://www.reuters.com/business/finance')).toBe(true);
      expect(isValidExternalUrl('https://www.thehindu.com/news/national')).toBe(true);
      expect(isValidExternalUrl('https://techcrunch.com/2026/03/startup')).toBe(true);
      expect(isValidExternalUrl('https://www.theguardian.com/world/live')).toBe(true);
    });
  });

  describe('interleaveAndDeduplicate', () => {
    it('interleaves news, movie, and social in round-robin order', () => {
      const news = [createMockItem('n1', 'news'), createMockItem('n2', 'news')];
      const movies = [createMockItem('m1', 'movie'), createMockItem('m2', 'movie')];
      const social = [createMockItem('s1', 'social'), createMockItem('s2', 'social')];

      const result = interleaveAndDeduplicate(news, movies, social);

      expect(result.map((r) => r.id)).toEqual(['n1', 'm1', 's1', 'n2', 'm2', 's2']);
    });

    it('deduplicates items with identical ids, normalized urls, or normalized titles', () => {
      const news = [
        {
          ...createMockItem('item-2', 'news'),
          title: 'Quantum Computing Breakthrough - CNN',
          url: 'https://example.com/quantum?utm_source=twitter',
        },
        createMockItem('item-1', 'news'),
      ];
      const movies = [
        {
          ...createMockItem('item-3', 'movie'),
          title: 'Quantum Computing Breakthrough - BBC', // Duplicate normalized title
          url: 'https://example.com/other',
        },
        createMockItem('item-1', 'movie'), // Duplicate ID
      ];
      const social = [
        {
          ...createMockItem('item-4', 'social'),
          title: 'Distinct Social Post',
          url: 'https://example.com/quantum?utm_source=facebook', // Duplicate normalized URL
        },
        createMockItem('item-5', 'social'),
      ];

      const result = interleaveAndDeduplicate(news, movies, social);

      // Should keep item-2, item-1, item-5 (dropping item-3 dup title, item-4 dup url, and item-1 dup id)
      expect(result.map((r) => r.id)).toEqual(['item-2', 'item-1', 'item-5']);
    });

    it('detects near-duplicate syndicated titles and drops the duplicate', () => {
      const news = [
        {
          ...createMockItem('n1', 'news'),
          title: '2 dead, 35 injured in shooting at Georgia block party',
        },
      ];
      const other = [
        {
          ...createMockItem('n2', 'news'),
          title: 'Two dead, 35 wounded in shooting at Georgia block party',
        },
      ];

      const result = interleaveAndDeduplicate(news, other);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n1');
    });

    it('handles arrays of unequal lengths smoothly', () => {
      const news = [
        createMockItem('n1', 'news'),
        createMockItem('n2', 'news'),
        createMockItem('n3', 'news'),
      ];
      const movies = [createMockItem('m1', 'movie')];
      const social: ContentItem[] = [];

      const result = interleaveAndDeduplicate(news, movies, social);

      expect(result.map((r) => r.id)).toEqual(['n1', 'm1', 'n2', 'n3']);
    });
  });

  describe('applyCustomOrder', () => {
    it('returns items untouched if customOrder is empty', () => {
      const items = [createMockItem('1', 'news'), createMockItem('2', 'movie')];
      expect(applyCustomOrder(items, [])).toEqual(items);
    });

    it('reorders matching items according to customOrder and appends remaining items', () => {
      const items = [
        createMockItem('a', 'news'),
        createMockItem('b', 'movie'),
        createMockItem('c', 'social'),
        createMockItem('d', 'news'),
      ];

      const customOrder = ['c', 'a'];
      const reordered = applyCustomOrder(items, customOrder);

      expect(reordered.map((r) => r.id)).toEqual(['c', 'a', 'b', 'd']);
    });
  });
});
