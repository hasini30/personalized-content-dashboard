import { UnderstandableSummary } from '@/types/content';

export interface SummarizerArticleInput {
  id: string;
  title: string;
  description?: string;
  content?: string;
  category?: string;
}

export interface SummarizerResult {
  summary: UnderstandableSummary;
  modelUsed?: string;
  isFallback?: boolean;
  isGrounded?: boolean;
  groundingScore?: number;
  error?: string;
}

export interface Summarizer {
  name: string;
  summarize(article: SummarizerArticleInput, lang?: string): Promise<SummarizerResult>;
}
