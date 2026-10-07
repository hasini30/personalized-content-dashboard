import { OpenRouterSummarizer } from '@/lib/summarizer/openRouterSummarizer';
import { SummaryCache } from '@/lib/summarizer/cache';
import { verifyGrounding } from '@/lib/summarizer/grounding';
import { getSummarizer, setSummarizer } from '@/lib/summarizer';
import { MockSummarizer } from '@/lib/summarizer/mockSummarizer';
import { UnderstandableSummary } from '@/types/content';

describe('OpenRouter Summarizer, Grounding, and Cache', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;
  let testCache: SummaryCache;

  const sampleArticle = {
    id: 'art-ai-breakthrough',
    title: 'Breakthrough Quantum Neural Networks Accelerate Drug Discovery',
    description:
      'Biochemists combine quantum annealing with generative models for molecular synthesis.',
    content:
      'In a peer-reviewed paper published this morning, computational biochemists revealed a hybrid quantum machine learning pipeline. The platform cuts the synthesis screening timeline for oncology compounds from four years down to two weeks. Pharmaceutical trials are slated to begin late this year across multiple international medical centres.',
    category: 'technology',
  };

  const sampleValidAiResponse = {
    simpleOverview:
      'Scientists have successfully paired quantum computing with artificial intelligence to dramatically accelerate cancer drug discovery from years down to weeks.',
    bulletPoints: [
      'What happened: Hybrid quantum neural networks reduced oncology drug screening time from 4 years to 2 weeks.',
      'Why it matters: Life-saving cancer therapies can be designed, tested, and approved much faster.',
      'What to expect next: Clinical trials will commence later this year at global research hospitals.',
    ],
    whyItMatters:
      'This breakthrough drastically accelerates how quickly life-saving medications reach patient treatments.',
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    testCache = new SummaryCache(10, 60000);
    setSummarizer(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    setSummarizer(null);
  });

  describe('OpenRouterSummarizer Core Functionality', () => {
    it('successfully calls OpenRouter API with primary model and returns grounded summary', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(sampleValidAiResponse),
              },
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        ['sarvam/sarvam-m'],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');

      expect(result.isFallback).toBe(false);
      expect(result.isGrounded).toBe(true);
      expect(result.modelUsed).toBe('google/gemini-2.0-flash-001');
      expect(result.summary.simpleOverview).toContain('cancer drug discovery');
      expect(result.groundingScore).toBeGreaterThanOrEqual(0.3);

      // Verify request payload and headers
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(options.headers['Authorization']).toBe('Bearer sk-or-test-key');
      expect(options.headers['HTTP-Referer']).toBe('https://feedpulse.local');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('google/gemini-2.0-flash-001');
      expect(body.temperature).toBe(0.2);
      expect(body.max_tokens).toBe(1500);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('cleans markdown code fences around JSON before parsing', async () => {
      const wrappedInFences = `\`\`\`json\n${JSON.stringify(sampleValidAiResponse)}\n\`\`\``;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: wrappedInFences } }],
        }),
      });

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        [],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(result.isFallback).toBe(false);
      expect(result.summary.simpleOverview).toBe(sampleValidAiResponse.simpleOverview);
    });

    it('caches successful summary by articleId + lang and serves from cache on next call', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(sampleValidAiResponse) } }],
        }),
      });
      global.fetch = fetchMock;

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        [],
        testCache
      );

      const result1 = await summarizer.summarize(sampleArticle, 'en');
      const result2 = await summarizer.summarize(sampleArticle, 'en');

      expect(result1.summary.simpleOverview).toBe(result2.summary.simpleOverview);
      expect(fetchMock).toHaveBeenCalledTimes(1); // Second call answered from LRU cache
    });

    it('retries on 429 and falls back to secondary model if primary model fails', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async (url, opts) => {
        callCount++;
        const body = JSON.parse(opts.body);
        if (body.model === 'google/gemini-2.0-flash-001') {
          return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
          };
        }
        // Fallback model succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(sampleValidAiResponse) } }],
          }),
        };
      });

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        ['sarvam/sarvam-m'],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(result.isFallback).toBe(false);
      expect(result.modelUsed).toBe('sarvam/sarvam-m');
      // 2 attempts on primary (1 retry on 429) + 1 attempt on fallback model = 3 calls
      expect(callCount).toBe(3);
    });

    it('handles 401 unauthorized / 402 payment required and falls back to short brief', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        statusText: 'Payment Required',
      });

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        ['sarvam/sarvam-m'],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(result.isFallback).toBe(true);
      expect(result.error).toBe('Summary unavailable right now');
      expect(result.summary.simpleOverview).toBeDefined();
      expect(result.summary.bulletPoints.length).toBeGreaterThan(0);
    });

    it('handles request timeout after 20 seconds and falls back gracefully', async () => {
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          })
      );

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        [],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(result.isFallback).toBe(true);
      expect(result.error).toBe('Summary unavailable right now');
      expect(result.summary.simpleOverview).toBeDefined();
    });

    it('handles malformed JSON structure from model and falls back', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Not a JSON object at all' } }],
        }),
      });

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        [],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(result.isFallback).toBe(true);
      expect(result.error).toBe('Summary unavailable right now');
    });

    it('regenerates once with strict reminder when first output fails factual grounding', async () => {
      const ungroundedSummary = {
        simpleOverview:
          'Bananas are yellow tropical fruits that grow on trees in Hawaii and Mexico.',
        bulletPoints: [
          'What happened: Farmers harvested a record number of organic sweet bananas.',
          'Why it matters: Global banana smoothie consumption reached new historical highs.',
        ],
        whyItMatters: 'Smoothies taste better with fresh tropical fruit.',
      };

      let attempt = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify(ungroundedSummary) } }],
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(sampleValidAiResponse) } }],
          }),
        };
      });

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        [],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(attempt).toBe(2);
      expect(result.isFallback).toBe(false);
      expect(result.isGrounded).toBe(true);
      expect(result.summary.simpleOverview).toContain('cancer drug discovery');
    });

    it('falls back to short brief when regeneration also fails factual grounding', async () => {
      const ungroundedSummary = {
        simpleOverview:
          'Bananas are yellow tropical fruits that grow on trees in Hawaii and Mexico.',
        bulletPoints: [
          'What happened: Farmers harvested a record number of organic sweet bananas.',
          'Why it matters: Global banana smoothie consumption reached new historical highs.',
        ],
        whyItMatters: 'Smoothies taste better with fresh tropical fruit.',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(ungroundedSummary) } }],
        }),
      });

      const summarizer = new OpenRouterSummarizer(
        'sk-or-test-key',
        'google/gemini-2.0-flash-001',
        [],
        testCache
      );

      const result = await summarizer.summarize(sampleArticle, 'en');
      expect(result.isFallback).toBe(true);
      expect(result.isGrounded).toBe(false);
      expect(result.error).toBe('Summary failed factual grounding verification');
      expect(result.summary.simpleOverview).toBeDefined();
    });

    it('returns mock brief when OPENROUTER_API_KEY is missing or empty', async () => {
      const summarizer = new OpenRouterSummarizer('', 'google/gemini-2.0-flash-001', [], testCache);
      const result = await summarizer.summarize(sampleArticle, 'en');

      expect(result.isFallback).toBe(true);
      expect(result.modelUsed).toBe('mock-brief');
      expect(result.error).toBe('Missing OpenRouter API Key');
      expect(result.summary.simpleOverview).toBeDefined();
    });
  });

  describe('Grounding Verifier (verifyGrounding)', () => {
    it('passes well-grounded summary with high token overlap', () => {
      const res = verifyGrounding(
        sampleValidAiResponse,
        `${sampleArticle.title}\n\n${sampleArticle.description}\n\n${sampleArticle.content}`,
        'en'
      );
      expect(res.isGrounded).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(0.3);
      expect(res.reason).toBeUndefined();
    });

    it('rejects hallucinated summary with disjoint terminology', () => {
      const hallucinated = {
        simpleOverview:
          'Formula One world champion completed twenty laps in Silverstone setting the wet weather record.',
        bulletPoints: [
          'What happened: Ferrari mechanics tweaked the rear wing aerodynamics.',
          'Why it matters: Red Bull might face tire degradation issues next race.',
        ],
      };
      const res = verifyGrounding(
        hallucinated,
        `${sampleArticle.title}\n\n${sampleArticle.description}\n\n${sampleArticle.content}`,
        'en'
      );
      expect(res.isGrounded).toBe(false);
      expect(res.score).toBeLessThan(0.3);
      expect(res.reason).toContain('Low grounding token overlap score');
    });

    it('rejects incomplete or structurally invalid summaries', () => {
      const invalid = {
        simpleOverview: 'Too short',
        bulletPoints: ['Only one bullet'],
      };
      const res = verifyGrounding(
        invalid as unknown as UnderstandableSummary,
        sampleArticle.content,
        'en'
      );
      expect(res.isGrounded).toBe(false);
      expect(res.reason).toBe('Overview too short');
    });

    it('verifies non-English translation preserving numbers and substantial length', () => {
      const hindiSummary = {
        simpleOverview:
          'वैज्ञानिकों ने कैंसर दवा अनुसंधान को 4 साल से घटाकर 2 सप्ताह करने के लिए क्वांटम तकनीक का उपयोग किया है।',
        bulletPoints: [
          'क्या हुआ: हाइब्रिड क्वांटम न्यूरल नेटवर्क ने दवा परीक्षण में 4 साल का समय घटा दिया।',
          'क्यों महत्वपूर्ण है: नई कैंसर थेरेपी तेजी से मरीजों तक पहुंचेगी।',
        ],
      };
      const res = verifyGrounding(hindiSummary, sampleArticle.content, 'hi');
      expect(res.isGrounded).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('SummaryCache (LRU and TTL)', () => {
    it('stores and retrieves by composite key articleId + lang', () => {
      const cache = new SummaryCache(5, 5000);
      const dummyResult = {
        summary: sampleValidAiResponse,
        modelUsed: 'test-model',
        isFallback: false,
      };

      cache.set('article-123', 'en', dummyResult);
      expect(cache.has('article-123', 'en')).toBe(true);
      expect(cache.has('article-123', 'hi')).toBe(false);
      expect(cache.get('article-123', 'en')?.modelUsed).toBe('test-model');
    });

    it('evicts least recently used items when maxSize is exceeded', () => {
      const cache = new SummaryCache(2, 50000);
      const res = (id: string) => ({
        summary: sampleValidAiResponse,
        modelUsed: id,
        isFallback: false,
      });

      cache.set('art-1', 'en', res('1'));
      cache.set('art-2', 'en', res('2'));
      // Access art-1 to make art-2 the oldest
      cache.get('art-1', 'en');
      cache.set('art-3', 'en', res('3'));

      expect(cache.get('art-1', 'en')).not.toBeNull();
      expect(cache.get('art-3', 'en')).not.toBeNull();
      expect(cache.get('art-2', 'en')).toBeNull(); // art-2 was evicted
    });

    it('expires stale entries beyond TTL', () => {
      const cache = new SummaryCache(5, -100); // negative TTL is immediately expired
      cache.set('art-stale', 'en', {
        summary: sampleValidAiResponse,
        modelUsed: 'test',
        isFallback: false,
      });

      expect(cache.get('art-stale', 'en')).toBeNull();
    });
  });

  describe('getSummarizer and setSummarizer factory', () => {
    it('returns OpenRouterSummarizer when OPENROUTER_API_KEY is present', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-real-key';
      const summarizer = getSummarizer();
      expect(summarizer.name).toBe('OpenRouterSummarizer');
    });

    it('returns MockSummarizer when OPENROUTER_API_KEY is not set', () => {
      delete process.env.OPENROUTER_API_KEY;
      const summarizer = getSummarizer();
      expect(summarizer.name).toBe('MockSummarizer');
    });

    it('allows overriding active summarizer via setSummarizer', () => {
      const mock = new MockSummarizer();
      setSummarizer(mock);
      expect(getSummarizer()).toBe(mock);
    });
  });
});
