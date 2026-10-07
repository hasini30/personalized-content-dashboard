import { SummarizerResult } from './types';

export interface SummaryCacheEntry {
  result: SummarizerResult;
  timestamp: number;
}

export class SummaryCache {
  private cache = new Map<string, SummaryCacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 500, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  public getCacheKey(articleId: string, lang = 'en'): string {
    return `${articleId}:${lang.toLowerCase().trim()}`;
  }

  public has(articleId: string, lang = 'en'): boolean {
    return this.get(articleId, lang) !== null;
  }

  public get(articleId: string, lang = 'en'): SummarizerResult | null {
    const key = this.getCacheKey(articleId, lang);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  public set(articleId: string, lang = 'en', result: SummarizerResult): void {
    const key = this.getCacheKey(articleId, lang);

    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const globalSummaryCache = new SummaryCache();
