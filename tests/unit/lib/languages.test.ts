import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  isValidLanguageCode,
  getLanguageDefinition,
  getLanguageDirection,
  languageCodeSchema,
} from '@/lib/languages';

describe('Languages Configuration and Validation', () => {
  it('strictly contains only the 11 Indian languages plus English default', () => {
    const expectedCodes = ['en', 'hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur'];

    expect(SUPPORTED_LANGUAGE_CODES).toEqual(expectedCodes);
    expect(SUPPORTED_LANGUAGES).toHaveLength(11);

    // Ensure non-Indian languages are completely excluded
    const nonIndian = ['es', 'fr', 'de', 'ja', 'ar', 'zh', 'ru', 'pt', 'it'];
    nonIndian.forEach((code) => {
      expect(isValidLanguageCode(code)).toBe(false);
      expect(SUPPORTED_LANGUAGE_CODES).not.toContain(code);
    });
  });

  it('validates language codes correctly with Zod schema', () => {
    expect(languageCodeSchema.parse('hi')).toBe('hi');
    expect(languageCodeSchema.parse('te')).toBe('te');
    expect(languageCodeSchema.parse(undefined)).toBe('en');

    expect(() => languageCodeSchema.parse('es')).toThrow();
    expect(() => languageCodeSchema.parse('fr')).toThrow();
    expect(() => languageCodeSchema.parse('invalid')).toThrow();
  });

  it('configures Urdu as RTL and all other languages as LTR', () => {
    expect(getLanguageDirection('ur')).toBe('rtl');
    const urduDef = getLanguageDefinition('ur');
    expect(urduDef.dir).toBe('rtl');
    expect(urduDef.nativeName).toBe('اردو');

    const ltrLanguages = ['en', 'hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa'];
    ltrLanguages.forEach((code) => {
      expect(getLanguageDirection(code)).toBe('ltr');
      expect(getLanguageDefinition(code).dir).toBe('ltr');
    });
  });

  it('provides font stacks for native scripts', () => {
    const hindi = getLanguageDefinition('hi');
    expect(hindi.fontStack).toContain('Noto Sans Devanagari');

    const telugu = getLanguageDefinition('te');
    expect(telugu.fontStack).toContain('Noto Sans Telugu');

    const urdu = getLanguageDefinition('ur');
    expect(urdu.fontStack).toContain('Noto Nastaliq Urdu');
  });
});
