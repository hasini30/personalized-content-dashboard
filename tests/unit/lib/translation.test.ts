import { MockTranslator, TranslationCache, setTranslator } from '@/lib/translation';
import newsFixtures from '@/lib/fixtures/newsFixtures.json';

describe('Translation Services & MockTranslator', () => {
  let cache: TranslationCache;
  let translator: MockTranslator;

  beforeEach(() => {
    cache = new TranslationCache(50);
    translator = new MockTranslator(cache);
    setTranslator(translator);
  });

  it('translates text accurately into Hindi and Telugu', async () => {
    const hindiRes = await translator.translate(
      'Next-Gen AI Hardware Accelerators Show 10x Efficiency Gains',
      'hi'
    );
    expect(hindiRes.isTranslated).toBe(true);
    expect(hindiRes.translatedText).toContain('अगली पीढ़ी के एआई हार्डवेयर एक्सेलेरेटर');

    const teluguRes = await translator.translate(
      'Next-Gen AI Hardware Accelerators Show 10x Efficiency Gains',
      'te'
    );
    expect(teluguRes.isTranslated).toBe(true);
    expect(teluguRes.translatedText).toContain('తదుపరి తరం AI హార్డ్‌వేర్ యాక్సిలరేటర్లు');
  });

  it('returns original English text when target language is English', async () => {
    const res = await translator.translate('Breaking News', 'en');
    expect(res.isTranslated).toBe(false);
    expect(res.translatedText).toBe('Breaking News');
  });

  it('translates full articles and caches translated results', async () => {
    const article = {
      id: 'test-art-1',
      title: 'Global markets rally as green energy investments hit record highs',
      description: 'Clean energy infrastructure spending exceeded $2 trillion globally this year.',
      content: 'Detailed reporting on solar and wind market rallies across the globe.',
    };

    const translated = await translator.translateArticle(article, 'hi');
    expect(translated.isTranslated).toBe(true);
    expect(translated.language).toBe('hi');
    expect(translated.originalTitle).toBe(article.title);
    expect(translated.originalDescription).toBe(article.description);
    expect(translated.title).toContain('हरित ऊर्जा में रिकॉर्ड निवेश');

    // Verify cache has this article
    const cached = cache.get('test-art-1', 'hi');
    expect(cached).toBeDefined();
    expect(cached?.title).toBe(translated.title);
  });

  it('gracefully falls back to original text when translation fails', async () => {
    translator.setSimulateFailure(true);

    const article = {
      id: 'test-art-fail',
      title: 'Breaking news on sports',
      description: 'Championship contenders clash in high-stakes match',
    };

    const result = await translator.translateArticle(article, 'hi');
    expect(result.isTranslated).toBe(false);
    expect(result.language).toBe('en');
    expect(result.title).toBe(article.title);
  });

  it('TranslationCache evicts least-recently-used entries when capacity is exceeded', () => {
    const smallCache = new TranslationCache(2);
    smallCache.set('a', 'hi', {
      title: 'A',
      description: 'A desc',
      isTranslated: true,
      language: 'hi',
      originalTitle: 'A',
      originalDescription: 'A desc',
    });
    smallCache.set('b', 'hi', {
      title: 'B',
      description: 'B desc',
      isTranslated: true,
      language: 'hi',
      originalTitle: 'B',
      originalDescription: 'B desc',
    });

    expect(smallCache.has('a', 'hi')).toBe(true);
    expect(smallCache.has('b', 'hi')).toBe(true);

    // Access 'a' to make 'b' the LRU
    smallCache.get('a', 'hi');

    // Add 'c', which should evict 'b'
    smallCache.set('c', 'hi', {
      title: 'C',
      description: 'C desc',
      isTranslated: true,
      language: 'hi',
      originalTitle: 'C',
      originalDescription: 'C desc',
    });

    expect(smallCache.has('a', 'hi')).toBe(true);
    expect(smallCache.has('c', 'hi')).toBe(true);
    expect(smallCache.has('b', 'hi')).toBe(false);
  });

  it('translates movie and social fixtures into Punjabi', async () => {
    const movie = await translator.translateArticle(
      {
        id: 'movie-1',
        title: 'Dune: Part Two (2024)',
        description:
          'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
      },
      'pa'
    );

    expect(movie.isTranslated).toBe(true);
    expect(movie.language).toBe('pa');
    expect(movie.title).toContain('ਡਿਊਨ: ਭਾਗ ਦੋ');
    expect(movie.description).toContain('ਪਾਲ ਐਟਰੀਡਜ਼');

    const social = await translator.translateArticle(
      {
        id: 'post-101',
        title: 'Elena Rostova (@elena_ai)',
        description:
          'Just deployed an autonomous multi-agent evaluation pipeline with Next.js 14 and RTK Query!',
      },
      'pa'
    );

    expect(social.isTranslated).toBe(true);
    expect(social.language).toBe('pa');
    expect(social.title).toContain('ਏਲੇਨਾ ਰੋਸਤੋਵਾ');
  });

  it('translates all news articles into Punjabi and Hindi without fallback errors', async () => {
    for (const item of newsFixtures) {
      const pa = await translator.translateArticle(
        { id: item.title, title: item.title, description: item.description },
        'pa'
      );
      expect(pa.isTranslated).toBe(true);
      expect(pa.title).not.toEqual(item.title);

      const hi = await translator.translateArticle(
        { id: item.title, title: item.title, description: item.description },
        'hi'
      );
      expect(hi.isTranslated).toBe(true);
      expect(hi.title).not.toEqual(item.title);
    }
  });
});
