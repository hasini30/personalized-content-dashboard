import { initDatabase, closeDatabase } from '@/lib/db/database';
import {
  getCachedArticleTranslation,
  getCachedTranslationByOriginalTitle,
  setCachedArticleTranslation,
  setCachedArticleTranslationsBatch,
  clearCachedTranslations,
} from '@/lib/db/translationRepository';
import { TranslationCache } from '@/lib/translation/cache';

describe('SQLite Translation Repository & Persistent Cache', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    clearCachedTranslations();
  });

  it('stores and retrieves an article translation by ID and language', () => {
    const payload = {
      title: 'గ్రీన్ ఎనర్జీ రికార్డు పెట్టుబడులు',
      description: 'పునరుత్పాదక ఇంధన వ్యయం $2 ట్రిలియన్లను దాటింది.',
      content: 'వివరాలు...',
      isTranslated: true,
      language: 'te',
      originalTitle: 'Global markets rally as green energy investments hit record highs',
      originalDescription: 'Clean energy infrastructure spending exceeded $2 trillion globally.',
      originalContent: 'Details...',
    };

    setCachedArticleTranslation('art-101', payload);

    const retrieved = getCachedArticleTranslation('art-101', 'te');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe(payload.title);
    expect(retrieved?.description).toBe(payload.description);
    expect(retrieved?.language).toBe('te');
    expect(retrieved?.originalTitle).toBe(payload.originalTitle);

    // Verify requesting a different language returns null
    const hindi = getCachedArticleTranslation('art-101', 'hi');
    expect(hindi).toBeNull();
  });

  it('retrieves cached translation by original title for identical syndicated headlines', () => {
    const payload = {
      title: 'हरित ऊर्जा में रिकॉर्ड निवेश',
      description: 'नवीकरणीय ऊर्जा खर्च $2 ट्रिलियन पार।',
      isTranslated: true,
      language: 'hi',
      originalTitle: 'Global markets rally as green energy investments hit record highs',
      originalDescription: 'Clean energy spending reached records.',
    };

    setCachedArticleTranslation('reuters-article-1', payload);

    // Look up by original title with different casing and punctuation
    const matched = getCachedTranslationByOriginalTitle(
      'global markets rally as green energy investments hit record highs!',
      'hi'
    );

    expect(matched).not.toBeNull();
    expect(matched?.title).toBe(payload.title);
    expect(matched?.language).toBe('hi');
  });

  it('inserts batches of translations atomically', () => {
    const items = [
      {
        articleId: 'art-b-1',
        payload: {
          title: 'শিরোনাম ১',
          description: 'বিবরণ ১',
          isTranslated: true,
          language: 'bn',
          originalTitle: 'Title 1',
          originalDescription: 'Description 1',
        },
      },
      {
        articleId: 'art-b-2',
        payload: {
          title: 'শিরোনাম ২',
          description: 'বিবরণ ২',
          isTranslated: true,
          language: 'bn',
          originalTitle: 'Title 2',
          originalDescription: 'Description 2',
        },
      },
    ];

    setCachedArticleTranslationsBatch(items);

    const res1 = getCachedArticleTranslation('art-b-1', 'bn');
    const res2 = getCachedArticleTranslation('art-b-2', 'bn');

    expect(res1?.title).toBe('শিরোনাম ১');
    expect(res2?.title).toBe('শিরোনাম ২');
  });

  it('hydrates TranslationCache from SQLite when in-memory cache is cold', () => {
    const payload = {
      title: 'ટેસ્લા શેર ઉછાળો',
      description: 'રોબોટેક્સી અનાવરણ નજીક છે.',
      isTranslated: true,
      language: 'gu',
      originalTitle: 'Tesla shares surge as robotaxi unveiling nears',
      originalDescription: 'Unveiling approaches.',
    };

    // Store in SQLite
    setCachedArticleTranslation('tesla-1', payload);

    // Create a fresh new in-memory cache
    const freshCache = new TranslationCache();

    // Cache should hit SQLite and return payload
    const retrieved = freshCache.get('tesla-1', 'gu');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe(payload.title);

    // Lookup by original title on cold cache
    const matchedByTitle = freshCache.getByOriginalTitle(payload.originalTitle, 'gu');
    expect(matchedByTitle).not.toBeNull();
    expect(matchedByTitle?.title).toBe(payload.title);
  });
});
