import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { UnifiedFeed } from '@/components/feed/UnifiedFeed';
import { ArticleReaderModal } from '@/components/cards/ArticleReaderModal';
import { renderWithProviders } from '../test-utils';
import { ContentItem } from '@/types/content';

// Mock RTK Query hooks in UnifiedFeed
jest.mock('@/services/api', () => {
  const actual = jest.requireActual('@/services/api');
  return {
    ...actual,
    useGetNewsQuery: jest.fn(() => {
      const items: ContentItem[] = [
        {
          id: 'news-pref-1',
          source: 'news',
          title: 'Preferred Tech News Story',
          description: 'Tech description',
          category: 'technology',
          publishedAt: '2026-10-03T10:00:00Z',
          url: 'https://example.com/1',
          isPreferred: true,
        },
        {
          id: 'news-other-2',
          source: 'news',
          title: 'Sports World Championship',
          description: 'Sports description',
          category: 'sports',
          publishedAt: '2026-10-03T09:00:00Z',
          url: 'https://example.com/2',
          isPreferred: false,
        },
      ];
      return {
        data: { items, total: 2, hasMore: false, isDemo: true, page: 1, pageSize: 6 },
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
      };
    }),
    useGetMoviesQuery: jest.fn(() => ({
      data: { items: [], total: 0, hasMore: false, isDemo: true, page: 1, pageSize: 6 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    })),
    useGetSocialQuery: jest.fn(() => ({
      data: { items: [], total: 0, hasMore: false, isDemo: true, page: 1, pageSize: 6 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    })),
  };
});

describe('Content Access and Language Integration Tests', () => {
  it('renders Feed Scope Toggle with "For You" and "All News"', () => {
    const { store } = renderWithProviders(<UnifiedFeed />, {
      preloadedState: {
        preferences: {
          categories: ['technology'],
          movieGenres: ['Action'],
          autoRefreshInterval: 30,
          feedScope: 'forYou',
          contentLanguage: 'en',
        },
      },
    });

    const forYouBtn = screen.getByRole('button', { name: /for you/i });
    const allNewsBtn = screen.getByRole('button', { name: /all news/i });

    expect(forYouBtn).toBeInTheDocument();
    expect(allNewsBtn).toBeInTheDocument();

    // Toggle to All News
    fireEvent.click(allNewsBtn);
    expect(store.getState().preferences.feedScope).toBe('all');

    // Toggle back to For You
    fireEvent.click(forYouBtn);
    expect(store.getState().preferences.feedScope).toBe('forYou');
  });

  it('renders "More from other topics" section divider in For You mode when other topics exist', () => {
    renderWithProviders(<UnifiedFeed />, {
      preloadedState: {
        preferences: {
          categories: ['technology'],
          movieGenres: ['Action'],
          autoRefreshInterval: 30,
          feedScope: 'forYou',
          contentLanguage: 'en',
        },
      },
    });

    expect(screen.getByText(/preferred tech news story/i)).toBeInTheDocument();
    expect(screen.getByText(/sports world championship/i)).toBeInTheDocument();
    expect(screen.getByText(/more from other topics/i)).toBeInTheDocument();
  });

  it('ArticleReaderModal renders translation status and allows switching to original English', () => {
    const translatedItem: ContentItem = {
      id: 'art-trans-1',
      source: 'news',
      title: 'हरित ऊर्जा में रिकॉर्ड निवेश के साथ वैश्विक बाजारों में उछाल',
      description:
        'स्वच्छ ऊर्जा बुनियादी ढांचे पर खर्च इस साल वैश्विक स्तर पर 2 ट्रिलियन डॉलर से अधिक हो गया',
      content: 'विस्तृत रिपोर्ट',
      category: 'finance',
      publishedAt: '2026-10-03T10:00:00Z',
      url: 'https://example.com/trans',
      isTranslated: true,
      language: 'hi',
      originalTitle: 'Global markets rally as green energy investments hit record highs',
      originalDescription:
        'Clean energy infrastructure spending exceeded $2 trillion globally this year.',
      originalContent: 'Detailed report on green energy investments.',
    };

    const handleClose = jest.fn();

    renderWithProviders(
      <ArticleReaderModal item={translatedItem} isOpen={true} onClose={handleClose} />
    );

    // Initial state shows translated text
    expect(screen.getByText(/हरित ऊर्जा में रिकॉर्ड निवेश/i)).toBeInTheDocument();
    expect(screen.getByText(/view original english/i)).toBeInTheDocument();

    // Click "View Original English"
    fireEvent.click(screen.getByText(/view original english/i));

    // Shows original English title
    expect(
      screen.getByText(/global markets rally as green energy investments/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/switch to translated/i)).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByText(/switch to translated/i));
    expect(screen.getByText(/हरित ऊर्जा में रिकॉर्ड निवेश/i)).toBeInTheDocument();
  });

  it('renders Urdu content with dir="rtl" in ArticleReaderModal', () => {
    const urduItem: ContentItem = {
      id: 'art-urdu-1',
      source: 'news',
      title: 'گرین انرجی کی ریکارڈ سرمایہ کاری',
      description: 'صاف توانائی کے بنیادی ڈھانچے پر اخراجات',
      category: 'finance',
      publishedAt: '2026-10-03T10:00:00Z',
      url: 'https://example.com/urdu',
      isTranslated: true,
      language: 'ur',
      originalTitle: 'Green energy record investments',
      originalDescription: 'Clean energy infrastructure spending',
    };

    renderWithProviders(<ArticleReaderModal item={urduItem} isOpen={true} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    const modalContent = dialog.querySelector('[dir="rtl"]');
    expect(modalContent).toBeInTheDocument();
  });
});
