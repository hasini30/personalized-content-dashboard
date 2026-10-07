import { z } from 'zod';

export interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  short: string;
  dir: 'ltr' | 'rtl';
  fontStack: string;
}

/**
 * Supported Indian Languages + English (default).
 * Strictly Indian languages only, as required by specification.
 */
export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    short: 'EN',
    dir: 'ltr',
    fontStack: 'var(--font-sans), sans-serif',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    short: 'HI',
    dir: 'ltr',
    fontStack: "'Noto Sans Devanagari', var(--font-sans), sans-serif",
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    short: 'BN',
    dir: 'ltr',
    fontStack: "'Noto Sans Bengali', var(--font-sans), sans-serif",
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    short: 'TE',
    dir: 'ltr',
    fontStack: "'Noto Sans Telugu', var(--font-sans), sans-serif",
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    short: 'TA',
    dir: 'ltr',
    fontStack: "'Noto Sans Tamil', var(--font-sans), sans-serif",
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    short: 'MR',
    dir: 'ltr',
    fontStack: "'Noto Sans Devanagari', var(--font-sans), sans-serif",
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    short: 'GU',
    dir: 'ltr',
    fontStack: "'Noto Sans Gujarati', var(--font-sans), sans-serif",
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    short: 'KN',
    dir: 'ltr',
    fontStack: "'Noto Sans Kannada', var(--font-sans), sans-serif",
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    short: 'ML',
    dir: 'ltr',
    fontStack: "'Noto Sans Malayalam', var(--font-sans), sans-serif",
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    short: 'PA',
    dir: 'ltr',
    fontStack: "'Noto Sans Gurmukhi', var(--font-sans), sans-serif",
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    short: 'UR',
    dir: 'rtl',
    fontStack: "'Noto Nastaliq Urdu', 'Noto Sans Arabic', var(--font-sans), sans-serif",
  },
] as const;

export const SUPPORTED_LANGUAGE_CODES = [
  'en',
  'hi',
  'bn',
  'te',
  'ta',
  'mr',
  'gu',
  'kn',
  'ml',
  'pa',
  'ur',
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const languageCodeSchema = z.enum(SUPPORTED_LANGUAGE_CODES).default('en');

export function isValidLanguageCode(code: string): code is SupportedLanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}

export function getLanguageDefinition(code: string): (typeof SUPPORTED_LANGUAGES)[number] {
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return match || SUPPORTED_LANGUAGES[0];
}

export function getLanguageDirection(code: string): 'ltr' | 'rtl' {
  return getLanguageDefinition(code).dir;
}
