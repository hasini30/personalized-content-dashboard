import {
  translateSentence,
  translateArticleWithEngine,
  IndianLanguage,
} from '@/lib/translation/multilingualEngine';

describe('Universal Multilingual Engine', () => {
  const targetLanguages: IndianLanguage[] = [
    'hi',
    'te',
    'ta',
    'bn',
    'mr',
    'gu',
    'kn',
    'ml',
    'pa',
    'ur',
  ];

  const sampleRssHeadlines = [
    'US warns Israel over Gaza humanitarian aid as deadline approaches',
    'Tesla shares surge as robotaxi unveiling nears amid global market rally',
    'Supreme Court hears arguments on presidential immunity',
    'Clean energy grid reaches 85% renewable peak across Central Europe',
    'Global semiconductor consortium unveils 1nm test platform',
  ];

  test.each(targetLanguages)(
    'translates dynamic news headline into language "%s" without raw English text remaining',
    (lang) => {
      const headline = 'US warns Israel over Gaza humanitarian aid as deadline approaches';
      const translated = translateSentence(headline, lang);

      expect(translated).toBeDefined();
      expect(translated.length).toBeGreaterThan(0);
      expect(translated).not.toEqual(headline);

      // Verify that no un-transliterated English words remain
      const latinLetters = translated.match(/[a-zA-Z]{2,}/g);
      expect(latinLetters).toBeNull();
    }
  );

  test.each(targetLanguages)(
    'translates full article object into language "%s" with isTranslated: true',
    (lang) => {
      const article = {
        id: 'rss-test-article',
        title: 'Tesla shares surge as robotaxi unveiling nears amid global market rally',
        description:
          'Investors celebrate historic gains in clean energy and electric vehicles across the globe.',
      };

      const result = translateArticleWithEngine(article, lang);

      expect(result.isTranslated).toBe(true);
      expect(result.language).toBe(lang);
      expect(result.title).not.toEqual(article.title);
      expect(result.description).not.toEqual(article.description);
      expect(result.originalTitle).toBe(article.title);
      expect(result.originalDescription).toBe(article.description);

      // Verify that titles have no un-transliterated English words remaining
      const titleLatin = result.title.match(/[a-zA-Z]{2,}/g);
      expect(titleLatin).toBeNull();
    }
  );

  it('preserves English original when target language is "en"', () => {
    const article = {
      id: 'en-article',
      title: 'Breaking News in Technology',
      description: 'Major developments in AI hardware.',
    };

    const result = translateArticleWithEngine(article, 'en');
    expect(result.isTranslated).toBe(false);
    expect(result.language).toBe('en');
    expect(result.title).toBe(article.title);
    expect(result.description).toBe(article.description);
  });

  it('translates multiple real RSS news headlines across publishers without failing', () => {
    for (const headline of sampleRssHeadlines) {
      for (const lang of targetLanguages) {
        const trans = translateSentence(headline, lang);
        expect(trans).toBeTruthy();
        expect(trans).not.toEqual(headline);
      }
    }
  });
});
