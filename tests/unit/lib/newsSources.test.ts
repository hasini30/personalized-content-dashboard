import { LANGUAGE_NEWS_SOURCES, getSourcesForLanguage } from '@/lib/news-sources';
import { SUPPORTED_LANGUAGE_CODES } from '@/lib/languages';

describe('Language News Sources Configuration', () => {
  it('configures news sources for all 11 supported Indian languages and English', () => {
    SUPPORTED_LANGUAGE_CODES.forEach((lang) => {
      const sources = getSourcesForLanguage(lang);
      expect(sources).toBeDefined();
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0].language).toBe(lang);
      expect(sources[0].url).toMatch(/^https?:\/\//);
    });
  });

  it('falls back to English sources when unknown language code is requested', () => {
    const fallback = getSourcesForLanguage('unknown');
    expect(fallback).toEqual(LANGUAGE_NEWS_SOURCES['en']);
  });
});
