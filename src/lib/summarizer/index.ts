import { Summarizer } from './types';
import { OpenRouterSummarizer } from './openRouterSummarizer';
import { globalMockSummarizer } from './mockSummarizer';

export * from './types';
export * from './cache';
export * from './grounding';
export * from './mockSummarizer';
export * from './openRouterSummarizer';

let activeSummarizer: Summarizer | null = null;

export function getSummarizer(): Summarizer {
  if (activeSummarizer) return activeSummarizer;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    activeSummarizer = new OpenRouterSummarizer(apiKey);
  } else {
    activeSummarizer = globalMockSummarizer;
  }

  return activeSummarizer;
}

export function setSummarizer(summarizer: Summarizer | null): void {
  activeSummarizer = summarizer;
}
