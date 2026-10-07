import {
  getNewsFeed,
  generateProceduralArticle,
  findNewsArticleById,
  normalizeCategory,
} from '@/lib/newsEngine';

describe('NewsEngine - Infinite Diverse News Generator', () => {
  describe('normalizeCategory', () => {
    it('normalizes synonym category names correctly', () => {
      expect(normalizeCategory('finance')).toBe('business');
      expect(normalizeCategory('climate')).toBe('environment');
      expect(normalizeCategory('TECHNOLOGY')).toBe('technology');
      expect(normalizeCategory('all')).toBe('all');
      expect(normalizeCategory(undefined)).toBe('all');
    });
  });

  describe('generateProceduralArticle', () => {
    it('generates realistic article with complete journalistic fields and high-res imagery', () => {
      const article = generateProceduralArticle('technology', 0);
      expect(article.title).toBeDefined();
      expect(article.title.length).toBeGreaterThan(15);
      expect(article.description).toBeDefined();
      expect(article.description!.length).toBeGreaterThan(30);
      expect(article.content).toBeDefined();
      expect(article.content!.split('\n\n').length).toBeGreaterThanOrEqual(3);
      expect(article.author).toBeDefined();
      expect(article.source?.name).toBeDefined();
      expect(article.urlToImage).toMatch(/^https:\/\/images\.unsplash\.com/);
      expect(article.url).toMatch(/^#procedural-technology-/);
      expect(article.category).toBe('technology');
    });

    it('generates distinct articles for different indices', () => {
      const article0 = generateProceduralArticle('science', 0);
      const article1 = generateProceduralArticle('science', 1);
      expect(article0.title).not.toBe(article1.title);
      expect(article0.url).not.toBe(article1.url);
    });
  });

  describe('getNewsFeed Pagination & Infinite Scrolling', () => {
    it('serves page 1 and page 2 without duplicates, keeping hasMore true for endless scrolling', () => {
      const page1 = getNewsFeed({ page: 1, pageSize: 6 });
      const page2 = getNewsFeed({ page: 2, pageSize: 6 });

      expect(page1.items.length).toBe(6);
      expect(page2.items.length).toBe(6);
      expect(page1.hasMore).toBe(true);
      expect(page2.hasMore).toBe(true);
      expect(page1.total).toBeGreaterThan(100);

      // Verify no duplicate IDs between successive pages
      const page1Ids = new Set(page1.items.map((i) => i.id));
      const page2Ids = new Set(page2.items.map((i) => i.id));
      const overlap = [...page2Ids].filter((id) => page1Ids.has(id));
      expect(overlap.length).toBe(0);
    });

    it('seamlessly supports deep infinite pagination (e.g. page 10)', () => {
      const page10 = getNewsFeed({ page: 10, pageSize: 6 });
      expect(page10.items.length).toBe(6);
      expect(page10.page).toBe(10);
      expect(page10.hasMore).toBe(true);
      expect(page10.items[0].title).toBeDefined();
    });

    it('filters news by category and provides continuous category-specific pagination', () => {
      const sportsPage1 = getNewsFeed({ page: 1, pageSize: 6, category: 'sports' });
      const sportsPage2 = getNewsFeed({ page: 2, pageSize: 6, category: 'sports' });

      expect(sportsPage1.items.length).toBe(6);
      sportsPage1.items.forEach((item) => {
        expect(item.category.toLowerCase()).toBe('sports');
      });

      expect(sportsPage2.items.length).toBe(6);
      sportsPage2.items.forEach((item) => {
        expect(item.category.toLowerCase()).toBe('sports');
      });
      expect(sportsPage1.hasMore).toBe(true);
    });

    it('ranks preferred categories first in "preferred" scope while retaining all-category access', () => {
      const result = getNewsFeed({
        page: 1,
        pageSize: 10,
        scope: 'preferred',
        preferredCategories: ['technology'],
      });

      expect(result.items.length).toBe(10);
      expect(result.items[0].category.toLowerCase()).toBe('technology');
      expect(result.items[0].isPreferred).toBe(true);

      const otherCategories = result.items.filter((i) => i.category.toLowerCase() !== 'technology');
      expect(otherCategories.length).toBeGreaterThan(0);
    });

    it('filters news semantically when search query is supplied', () => {
      const result = getNewsFeed({
        q: 'semiconductor chip processor',
        page: 1,
        pageSize: 5,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].title.toLowerCase()).toMatch(/ai|hardware|accelerator|silicon|chip/);
    });
  });

  describe('findNewsArticleById', () => {
    it('retrieves an existing article by ID', () => {
      const feed = getNewsFeed({ page: 1, pageSize: 5 });
      const targetId = feed.items[0].id;

      const found = findNewsArticleById(targetId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(targetId);
    });

    it('returns undefined for non-existent ID', () => {
      const found = findNewsArticleById('non-existent-news-id-999');
      expect(found).toBeUndefined();
    });
  });
});
