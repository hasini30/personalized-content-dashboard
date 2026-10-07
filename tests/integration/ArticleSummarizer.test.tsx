import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { ArticleReaderModal } from '@/components/cards/ArticleReaderModal';
import { renderWithProviders } from '../test-utils';
import { ContentItem } from '@/types/content';
import * as apiModule from '@/services/api';

// Spy on useGetArticleSummaryQuery
jest.mock('@/services/api', () => {
  const actual = jest.requireActual('@/services/api');
  return {
    ...actual,
    useGetArticleSummaryQuery: jest.fn(),
  };
});

describe('ArticleSummarizer Integration Flow', () => {
  const sampleNews: ContentItem = {
    id: 'news-openrouter-test',
    source: 'news',
    title: 'Superconductor Discovery Confirmed by Global Labs',
    description: 'Independent validation confirms zero electrical resistance at ambient pressure.',
    content:
      'Laboratories worldwide have independently validated room temperature superconductivity. The measured resistance dropped abruptly to zero beneath 294 Kelvin. Power grids and levitation systems can now operate without cryogenic cooling.',
    category: 'science',
    publishedAt: '2026-10-03T12:00:00Z',
    author: 'Quantum Wire Service',
    url: 'https://example.com/quantum',
    isDemo: true,
  };

  const sampleAiSummary = {
    simpleOverview:
      'Independent laboratories have officially verified room-temperature superconductivity, paving the way for ultra-efficient power grids.',
    bulletPoints: [
      'What happened: Global labs confirmed zero electrical resistance at room temperature.',
      'Why it matters: Eliminates massive energy transmission losses without needing liquid helium.',
      'What to expect next: Power grid operators are planning pilot test deployments.',
    ],
    whyItMatters:
      'Electricity can now travel worldwide with zero transmission waste, reducing power costs.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when OpenRouter AI summarization is in flight', () => {
    (apiModule.useGetArticleSummaryQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(<ArticleReaderModal item={sampleNews} isOpen={true} onClose={jest.fn()} />);

    expect(
      screen.getByText(/Generating verified AI executive summary with OpenRouter/i)
    ).toBeInTheDocument();
  });

  it('renders AI Summary badge and AI-generated summary content when OpenRouter succeeds', () => {
    (apiModule.useGetArticleSummaryQuery as jest.Mock).mockReturnValue({
      data: {
        id: sampleNews.id,
        lang: 'en',
        summary: sampleAiSummary,
        modelUsed: 'google/gemini-2.0-flash-001',
        isFallback: false,
        isGrounded: true,
        groundingScore: 0.88,
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<ArticleReaderModal item={sampleNews} isOpen={true} onClose={jest.fn()} />);

    // AI summary badge
    expect(screen.getByText('AI Summary')).toBeInTheDocument();

    // AI generated content
    expect(
      screen.getByText(
        /Independent laboratories have officially verified room-temperature superconductivity/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Eliminates massive energy transmission losses without needing liquid helium/i
      )
    ).toBeInTheDocument();

    // Zero publisher redirect buttons
    expect(screen.queryByText(/visit publisher/i)).not.toBeInTheDocument();
  });

  it('displays friendly notice and falls back to standard editorial brief when provider fails or errors', () => {
    (apiModule.useGetArticleSummaryQuery as jest.Mock).mockReturnValue({
      data: {
        id: sampleNews.id,
        lang: 'en',
        summary: null,
        modelUsed: 'mock-brief',
        isFallback: true,
        error: 'Summary unavailable right now',
      },
      isLoading: false,
      isError: true,
    });

    renderWithProviders(<ArticleReaderModal item={sampleNews} isOpen={true} onClose={jest.fn()} />);

    // Fallback notice banner is displayed
    expect(
      screen.getByText(/Summary unavailable right now\. Showing standard editorial brief\./i)
    ).toBeInTheDocument();

    // Plain English fallback summary is still rendered cleanly
    expect(screen.getByText(/In Plain English/i)).toBeInTheDocument();
    expect(screen.getByText(/Key Takeaways/i)).toBeInTheDocument();
  });

  it('requests summary in target language when article is translated', () => {
    const translatedArticle: ContentItem = {
      ...sampleNews,
      language: 'hi',
      isTranslated: true,
      title: 'सुपरकंडक्टर खोज की वैश्विक पुष्टि',
      originalTitle: sampleNews.title,
    };

    (apiModule.useGetArticleSummaryQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    renderWithProviders(
      <ArticleReaderModal item={translatedArticle} isOpen={true} onClose={jest.fn()} />
    );

    // Verify useGetArticleSummaryQuery was invoked with target lang 'hi'
    expect(apiModule.useGetArticleSummaryQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sampleNews.id,
        lang: 'hi',
      }),
      expect.anything()
    );

    // Toggle "View Original English"
    const viewOriginalBtn = screen.getByRole('button', { name: /view original english/i });
    fireEvent.click(viewOriginalBtn);

    // Now lang should be 'en'
    expect(apiModule.useGetArticleSummaryQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sampleNews.id,
        lang: 'en',
      }),
      expect.anything()
    );
  });
});
