import { TranslatedArticlePayload } from './types';
import {
  getCachedArticleTranslation,
  getCachedTranslationByOriginalTitle,
  setCachedArticleTranslation,
} from '../db/translationRepository';

export interface CacheEntry {
  payload: TranslatedArticlePayload;
  timestamp: number;
}

export class TranslationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  public getCacheKey(articleId: string, lang: string): string {
    return `${articleId}:${lang.toLowerCase().trim()}`;
  }

  public has(articleId: string, lang: string): boolean {
    const key = this.getCacheKey(articleId, lang);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  public get(articleId: string, lang: string): TranslatedArticlePayload | null {
    const key = this.getCacheKey(articleId, lang);
    const entry = this.cache.get(key);
    if (entry) {
      if (Date.now() - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      } else {
        // Refresh position for LRU
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.payload;
      }
    }

    // Secondary check: SQLite persistent database store
    try {
      const dbPayload = getCachedArticleTranslation(articleId, lang);
      if (dbPayload) {
        // Hydrate in-memory LRU cache
        this.cache.set(key, { payload: dbPayload, timestamp: Date.now() });
        return dbPayload;
      }
    } catch {
      // Fall through smoothly
    }

    return null;
  }

  public getByOriginalTitle(originalTitle: string, lang: string): TranslatedArticlePayload | null {
    if (!originalTitle) return null;
    try {
      return getCachedTranslationByOriginalTitle(originalTitle, lang);
    } catch {
      return null;
    }
  }

  public set(articleId: string, lang: string, payload: TranslatedArticlePayload): void {
    const key = this.getCacheKey(articleId, lang);

    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Evict oldest entry (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      payload,
      timestamp: Date.now(),
    });

    // Secondary persist: SQLite persistent store
    try {
      setCachedArticleTranslation(articleId, payload);
    } catch {
      // Fail safe
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const globalTranslationCache = new TranslationCache();
