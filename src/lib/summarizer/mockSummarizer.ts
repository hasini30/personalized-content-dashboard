import { Summarizer, SummarizerArticleInput, SummarizerResult } from './types';
import { getUnderstandableSummary } from '@/lib/newsSummaryUtils';

export class MockSummarizer implements Summarizer {
  public name = 'MockSummarizer';

  public async summarize(article: SummarizerArticleInput, _lang = 'en'): Promise<SummarizerResult> {
    const summary = getUnderstandableSummary({
      title: article.title,
      description: article.description,
      content: article.content,
      category: article.category,
    });

    return {
      summary,
      modelUsed: 'mock-brief',
      isFallback: true,
      isGrounded: true,
      groundingScore: 1.0,
    };
  }
}

export const globalMockSummarizer = new MockSummarizer();
