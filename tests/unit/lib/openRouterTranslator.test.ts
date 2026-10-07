import { OpenRouterTranslator } from '@/lib/translation/openRouterTranslator';
import { TranslationCache } from '@/lib/translation/cache';
import { getTranslator, setTranslator, Translator } from '@/lib/translation';
import { MockTranslator } from '@/lib/translation/mockTranslator';

describe('OpenRouterTranslator Adapter and Factory', () => {
  let cache: TranslationCache;
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    cache = new TranslationCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('translates text successfully via OpenRouter API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'ताज़ा खबर',
            },
          },
        ],
      }),
    });

    const translator = new OpenRouterTranslator(
      'sk-or-test-key',
      'google/gemini-2.5-flash',
      [],
      cache
    );
    const res = await translator.translate('Breaking News', 'hi');

    expect(res.isTranslated).toBe(true);
    expect(res.translatedText).toBe('ताज़ा खबर');
  });

  it('returns original text without API call for English or empty text', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const translator = new OpenRouterTranslator(
      'sk-or-test-key',
      'google/gemini-2.5-flash',
      [],
      cache
    );
    const res1 = await translator.translate('English Headline', 'en');
    const res2 = await translator.translate('', 'hi');

    expect(res1.isTranslated).toBe(false);
    expect(res1.translatedText).toBe('English Headline');
    expect(res2.isTranslated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('translates article using OpenRouter and caches result', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'अनुवादित शीर्षक',
                description: 'अनुवादित विवरण',
              }),
            },
          },
        ],
      }),
    });

    const translator = new OpenRouterTranslator(
      'sk-or-test-key',
      'google/gemini-2.5-flash',
      [],
      cache
    );
    const article = {
      id: 'art-unique-123',
      title: 'Unique Custom Research Story',
      description: 'Novel methodology verified in experiments.',
    };

    const res = await translator.translateArticle(article, 'hi');
    expect(res.isTranslated).toBe(true);
    expect(res.title).toBe('अनुवादित शीर्षक');
    expect(res.description).toBe('अनुवादित विवरण');
    expect(cache.has(article.id, 'hi')).toBe(true);
  });

  it('serves curated translation immediately when available', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const translator = new OpenRouterTranslator(
      'sk-or-test-key',
      'google/gemini-2.5-flash',
      [],
      cache
    );
    const article = {
      id: 'art-curated-1',
      title: 'Next-Gen AI Hardware Accelerators Show 10x Efficiency Gains',
      description: 'Photonic computing chips show dramatic power reductions.',
    };

    const res = await translator.translateArticle(article, 'hi');
    expect(res.isTranslated).toBe(true);
    expect(res.title).toContain('अगली पीढ़ी');
    expect(res.description).toContain('फोटोनिक');
    // Curated match is served without calling external API
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to mock translator gracefully on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const translator = new OpenRouterTranslator(
      'sk-or-test-key',
      'google/gemini-2.5-flash',
      [],
      cache
    );
    const article = {
      id: 'art-fail-1',
      title: 'Uncurated Fallback Headline',
      description: 'Uncurated fallback description.',
    };

    const res = await translator.translateArticle(article, 'hi');
    expect(res.isTranslated).toBe(true);
    expect(res.language).toBe('hi');
  });

  describe('getTranslator factory', () => {
    it('selects OpenRouterTranslator when OPENROUTER_API_KEY is present and no cloud keys', () => {
      delete process.env.GOOGLE_TRANSLATE_API_KEY;
      delete process.env.AZURE_TRANSLATOR_KEY;
      process.env.OPENROUTER_API_KEY = 'sk-or-test';

      const mockTrans = new MockTranslator();
      setTranslator(null as unknown as Translator);
      const trans = getTranslator();
      expect(trans.name).toBe('OpenRouterTranslator');
      setTranslator(mockTrans);
    });
  });
});
