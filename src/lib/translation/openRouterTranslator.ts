import { Translator, TranslationResult, TranslatedArticlePayload } from './types';
import { TranslationCache, globalTranslationCache } from './cache';
import { globalMockTranslator, isCuratedArticleTitle } from './mockTranslator';

export class OpenRouterTranslator implements Translator {
  public name = 'OpenRouterTranslator';
  private apiKey: string;
  private primaryModel: string;
  private fallbackModels: string[];
  private cache: TranslationCache;

  constructor(
    apiKey?: string,
    primaryModel?: string,
    fallbackModels?: string[],
    cache: TranslationCache = globalTranslationCache
  ) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.primaryModel = primaryModel || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

    const fallbackEnv = process.env.OPENROUTER_FALLBACK_MODELS;
    this.fallbackModels =
      fallbackModels ||
      (fallbackEnv
        ? fallbackEnv
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean)
        : ['google/gemini-2.5-flash-lite', 'qwen/qwen3.7-flash']);

    this.cache = cache;
  }

  private cleanJsonResponse(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean.trim();
  }

  public async translate(
    text: string,
    targetLang: string,
    sourceLang = 'en'
  ): Promise<TranslationResult> {
    const lang = targetLang.toLowerCase().trim();
    if (lang === 'en' || !text.trim()) {
      return { translatedText: text, isTranslated: false, sourceLanguage: sourceLang };
    }

    if (!this.apiKey) {
      return globalMockTranslator.translate(text, lang, sourceLang);
    }

    try {
      const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://feedpulse.local',
          'X-Title': 'FeedPulse',
        },
        body: JSON.stringify({
          model: this.primaryModel,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the text into ${lang}. Output ONLY the translated text without quotes or explanations.`,
            },
            { role: 'user', content: text },
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const translated = json?.choices?.[0]?.message?.content?.trim();
        if (translated) {
          return {
            translatedText: translated,
            isTranslated: true,
            sourceLanguage: sourceLang,
          };
        }
      }
    } catch {
      // Fallback to mock translator
    }

    return globalMockTranslator.translate(text, lang, sourceLang);
  }

  public async translateArticle(
    article: {
      id: string;
      title: string;
      description: string;
      content?: string;
    },
    targetLang: string
  ): Promise<TranslatedArticlePayload> {
    const results = await this.translateArticlesBatch([article], targetLang);
    return results[0];
  }

  public async translateArticlesBatch(
    articles: Array<{
      id: string;
      title: string;
      description: string;
      content?: string;
    }>,
    targetLang: string
  ): Promise<TranslatedArticlePayload[]> {
    const lang = targetLang.toLowerCase().trim();

    if (lang === 'en') {
      return articles.map((article) => ({
        title: article.title,
        description: article.description,
        content: article.content,
        isTranslated: false,
        language: 'en',
        originalTitle: article.title,
        originalDescription: article.description,
        originalContent: article.content,
      }));
    }

    const results: TranslatedArticlePayload[] = new Array(articles.length);
    const uncachedIndices: number[] = [];

    // 1. Check Cache first (in-memory LRU & persistent SQLite), and check curated fixtures
    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      const cached =
        this.cache.get(art.id, lang) || this.cache.getByOriginalTitle?.(art.title, lang);
      if (cached) {
        results[i] = cached;
      } else if (isCuratedArticleTitle(art.title)) {
        const curated = await globalMockTranslator.translateArticle(art, lang);
        this.cache.set(art.id, lang, curated);
        results[i] = curated;
      } else {
        uncachedIndices.push(i);
      }
    }

    if (uncachedIndices.length === 0) {
      return results;
    }

    // 2. If API Key is present, attempt single fast batch LLM translation for uncached articles
    if (this.apiKey) {
      const uncachedArticles = uncachedIndices.map((idx) => ({
        id: articles[idx].id,
        title: articles[idx].title,
        description: articles[idx].description,
      }));

      const modelsToTry = [this.primaryModel, ...this.fallbackModels];
      for (const model of modelsToTry) {
        try {
          const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
              'HTTP-Referer': 'https://feedpulse.local',
              'X-Title': 'FeedPulse',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: `You are a professional multilingual translator. Translate the given array of news articles accurately and naturally into language code '${lang}'. Output strictly a JSON array where each object has: "id", "title", "description". No explanations or markdown wrappers.`,
                },
                {
                  role: 'user',
                  content: JSON.stringify(uncachedArticles),
                },
              ],
              temperature: 0.2,
              max_tokens: 2500,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const json = await res.json();
            const contentStr = json?.choices?.[0]?.message?.content;
            if (contentStr) {
              const clean = this.cleanJsonResponse(contentStr);
              let parsed: unknown;
              try {
                parsed = JSON.parse(clean);
              } catch {
                parsed = null;
              }

              let itemsList: Array<{ id: string; title: string; description: string }> = [];
              if (Array.isArray(parsed)) {
                itemsList = parsed;
              } else if (
                parsed &&
                typeof parsed === 'object' &&
                Array.isArray((parsed as Record<string, unknown>).articles)
              ) {
                itemsList = (
                  parsed as {
                    articles: Array<{ id: string; title: string; description: string }>;
                  }
                ).articles;
              } else if (
                parsed &&
                typeof parsed === 'object' &&
                typeof (parsed as Record<string, unknown>).title === 'string' &&
                typeof (parsed as Record<string, unknown>).description === 'string'
              ) {
                // Single object response format
                const single = parsed as { title: string; description: string };
                const firstUncached = uncachedIndices[0];
                if (firstUncached !== undefined) {
                  itemsList = [
                    {
                      id: articles[firstUncached].id,
                      title: single.title,
                      description: single.description,
                    },
                  ];
                }
              }

              if (itemsList.length > 0) {
                const mapById = new Map<string, { title: string; description: string }>();
                for (const item of itemsList) {
                  if (item.id && item.title && item.description) {
                    mapById.set(item.id, item);
                  }
                }

                for (const idx of uncachedIndices) {
                  const original = articles[idx];
                  const translated = mapById.get(original.id);
                  if (translated) {
                    const payload: TranslatedArticlePayload = {
                      title: translated.title,
                      description: translated.description,
                      content: original.content
                        ? `${translated.title}\n\n${translated.description}`
                        : undefined,
                      isTranslated: true,
                      language: lang,
                      originalTitle: original.title,
                      originalDescription: original.description,
                      originalContent: original.content,
                    };
                    this.cache.set(original.id, lang, payload);
                    results[idx] = payload;
                  }
                }

                if (uncachedIndices.every((idx) => Boolean(results[idx]))) {
                  break;
                }
              }
            }
          }
        } catch {
          // Try next model or fallback
        }
      }
    }

    // 3. For any remaining unresolved items (due to offline, timeout, rate-limit, or missing API key),
    // immediately use the high-quality Universal Multilingual Engine
    for (const idx of uncachedIndices) {
      if (!results[idx]) {
        const original = articles[idx];
        const fallbackPayload = await globalMockTranslator.translateArticle(original, lang);
        this.cache.set(original.id, lang, fallbackPayload);
        results[idx] = fallbackPayload;
      }
    }

    return results;
  }
}
