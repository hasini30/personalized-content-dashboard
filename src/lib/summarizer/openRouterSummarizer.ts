import { Summarizer, SummarizerArticleInput, SummarizerResult } from './types';
import { SummaryCache, globalSummaryCache } from './cache';
import { verifyGrounding } from './grounding';
import { getUnderstandableSummary } from '@/lib/newsSummaryUtils';
import { UnderstandableSummary } from '@/types/content';

export class OpenRouterSummarizer implements Summarizer {
  public name = 'OpenRouterSummarizer';
  private apiKey: string;
  private primaryModel: string;
  private fallbackModels: string[];
  private cache: SummaryCache;

  constructor(
    apiKey?: string,
    primaryModel?: string,
    fallbackModels?: string[],
    cache: SummaryCache = globalSummaryCache
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

  /**
   * Cleans JSON strings that might be enclosed in markdown code fences.
   */
  private cleanJsonResponse(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean.trim();
  }

  /**
   * Executes a single completion call to OpenRouter with a ~20s timeout.
   */
  private async callOpenRouterApi(
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    signal: AbortSignal
  ): Promise<Response> {
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://feedpulse.local',
        'X-Title': 'FeedPulse',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      signal,
    });
  }

  /**
   * Attempts completion with 1 retry on 429 or 5xx before giving up on that model.
   */
  private async requestWithRetry(
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>
  ): Promise<{ ok: boolean; data?: UnderstandableSummary; status?: number; error?: string }> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await this.callOpenRouterApi(model, messages, controller.signal);
        clearTimeout(timeoutId);

        // Explicit status code handling
        if (response.status === 401 || response.status === 402) {
          const errorBody = await response.text().catch(() => '');
          console.error(
            `[OpenRouterSummarizer] Auth/Credit Error HTTP ${response.status}:`,
            errorBody
          );
          return {
            ok: false,
            status: response.status,
            error:
              response.status === 402
                ? 'OpenRouter account out of credits'
                : 'Invalid or unauthorized OpenRouter API key',
          };
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          return { ok: false, status: response.status, error: `Upstream error ${response.status}` };
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          console.error(
            `[OpenRouterSummarizer] Model ${model} returned HTTP ${response.status}:`,
            errorBody
          );
          return {
            ok: false,
            status: response.status,
            error: `HTTP ${response.status}: ${errorBody}`,
          };
        }

        const json = await response.json();
        const contentStr = json?.choices?.[0]?.message?.content;
        if (!contentStr) {
          return { ok: false, error: 'Malformed response structure from model' };
        }

        const cleaned = this.cleanJsonResponse(contentStr);
        const parsed = JSON.parse(cleaned) as UnderstandableSummary;

        if (!parsed.simpleOverview || !Array.isArray(parsed.bulletPoints)) {
          return { ok: false, error: 'Summary schema incomplete' };
        }

        return { ok: true, data: parsed };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const error = err as Error;
        const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');

        if (attempt < maxAttempts && !isTimeout) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        return {
          ok: false,
          error: isTimeout ? 'Request timed out after 20 seconds' : error.message,
        };
      }
    }

    return { ok: false, error: 'Max retries exhausted' };
  }

  public async summarize(article: SummarizerArticleInput, lang = 'en'): Promise<SummarizerResult> {
    const targetLang = lang.toLowerCase().trim();

    // Check Cache first
    const cached = this.cache.get(article.id, targetLang);
    if (cached) {
      return cached;
    }

    // Default fallback brief
    const defaultBrief = getUnderstandableSummary({
      title: article.title,
      description: article.description,
      content: article.content,
      category: article.category,
    });

    if (!this.apiKey || this.apiKey.trim() === '') {
      return {
        summary: defaultBrief,
        modelUsed: 'mock-brief',
        isFallback: true,
        isGrounded: true,
        error: 'Missing OpenRouter API Key',
      };
    }

    // Truncate very long article text before sending
    const maxContentChars = 10000;
    const truncatedContent = (article.content || '').slice(0, maxContentChars);
    const sourceText = `${article.title}\n\n${article.description || ''}\n\n${truncatedContent}`;

    // System prompt from ARTICLE PAGE RULES v2
    const systemPrompt = `You are an expert news editor and factual summarizer. Summarize the provided news article accurately and objectively without hallucinating any facts.
Output STRICTLY valid JSON with the following structure:
{
  "simpleOverview": "A clear, accessible 3-4 sentence summary of the article in plain language.",
  "bulletPoints": [
    "What happened: [Key event/fact]",
    "Why it matters: [Significance or impact]",
    "What to expect next: [Future outlook or next steps]"
  ],
  "whyItMatters": "One sentence explaining why this matters to everyday readers."
}
Rules:
- Never include facts, names, or figures that are not present in the article.
- Write the summary in the requested language: ${targetLang}. If not English, write in natural, fluent Indic script.
- Output ONLY the raw JSON object, no markdown formatting or extra text.`;

    const userMessage = `Target Language: ${targetLang}\n\nArticle Title: ${article.title}\nDescription: ${
      article.description || ''
    }\nContent: ${truncatedContent}`;

    const modelsToTry = [this.primaryModel, ...this.fallbackModels];

    for (const model of modelsToTry) {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const res = await this.requestWithRetry(model, messages);

      if (res.ok && res.data) {
        // Grounding Check
        let grounding = verifyGrounding(res.data, sourceText, targetLang);

        // On failure, regenerate once with grounding reminder
        if (!grounding.isGrounded) {
          const regenerationMessages: Array<{ role: 'system' | 'user'; content: string }> = [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `${userMessage}\n\nCRITICAL WARNING: Your previous output had ungrounded claims. Strict factual grounding required based exclusively on the provided text above.`,
            },
          ];

          const regenRes = await this.requestWithRetry(model, regenerationMessages);
          if (regenRes.ok && regenRes.data) {
            grounding = verifyGrounding(regenRes.data, sourceText, targetLang);
            if (grounding.isGrounded) {
              const result: SummarizerResult = {
                summary: regenRes.data,
                modelUsed: model,
                isFallback: false,
                isGrounded: true,
                groundingScore: grounding.score,
              };
              this.cache.set(article.id, targetLang, result);
              return result;
            }
          }

          // If regeneration fails grounding, fall back to short brief
          return {
            summary: defaultBrief,
            modelUsed: model,
            isFallback: true,
            isGrounded: false,
            error: 'Summary failed factual grounding verification',
          };
        }

        // Successfully grounded
        const result: SummarizerResult = {
          summary: res.data,
          modelUsed: model,
          isFallback: false,
          isGrounded: true,
          groundingScore: grounding.score,
        };
        this.cache.set(article.id, targetLang, result);
        return result;
      }
    }

    // All models or retries failed -> Friendly unavailable state that still shows the short brief
    return {
      summary: defaultBrief,
      modelUsed: 'fallback-brief',
      isFallback: true,
      error: 'Summary unavailable right now',
    };
  }
}
