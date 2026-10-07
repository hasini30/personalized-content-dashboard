import { Translator } from './types';
import { OpenRouterTranslator } from './openRouterTranslator';
import { globalMockTranslator } from './mockTranslator';
import { globalTranslationCache } from './cache';

export * from './types';
export * from './cache';
export * from './mockTranslator';
export * from './openRouterTranslator';
export * from './multilingualEngine';

let activeTranslator: Translator | null = null;

export function getTranslator(): Translator {
  if (activeTranslator) return activeTranslator;

  if (process.env.OPENROUTER_API_KEY) {
    activeTranslator = new OpenRouterTranslator(
      process.env.OPENROUTER_API_KEY,
      process.env.OPENROUTER_MODEL,
      undefined,
      globalTranslationCache
    );
  } else {
    activeTranslator = globalMockTranslator;
  }

  return activeTranslator;
}

export function setTranslator(translator: Translator): void {
  activeTranslator = translator;
}
