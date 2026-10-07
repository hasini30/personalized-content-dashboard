import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { UnifiedFeed } from '@/components/feed/UnifiedFeed';
import { ContentItem } from '@/types/content';

const mockNews: ContentItem[] = [
  {
    id: 'news-quantum',
    source: 'news',
    title: 'Quantum Hardware Breakthrough',
    description: 'Quantum hardware advances show promise for new computations.',
    url: 'https://example.com/quantum',
    category: 'technology',
    publishedAt: '2026-03-03T10:00:00Z',
    author: 'Tech Reporter',
    isDemo: true,
  },
];

const mockMovies: ContentItem[] = [
  {
    id: 'movie-dune',
    source: 'movie',
    title: 'Dune: Part Two (2024)',
    description: 'Paul Atreides unites with the Fremen.',
    url: 'https://example.com/dune',
    category: 'entertainment',
    publishedAt: '2024-03-01T00:00:00Z',
    author: 'TMDB ★ 8.2',
    isDemo: true,
  },
];

const mockSocial: ContentItem[] = [
  {
    id: 'social-ai',
    source: 'social',
    title: 'Elena Rostova (@elena)',
    description: 'Autonomous systems are advancing rapidly!',
    url: 'https://example.com/status/1',
    category: 'technology',
    publishedAt: '2026-03-03T11:00:00Z',
    author: 'Elena Rostova @elena',
    isDemo: true,
  },
];

describe('UnifiedFeed Integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const urlStr =
        typeof input === 'string'
          ? input
          : 'url' in input
            ? (input as Request).url
            : input.toString();

      if (urlStr.includes('/news')) {
        return Promise.resolve(
          new globalThis.Response(
            JSON.stringify({
              items: mockNews,
              page: 1,
              pageSize: 6,
              total: 1,
              hasMore: false,
              isDemo: true,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }
      if (urlStr.includes('/movies')) {
        return Promise.resolve(
          new globalThis.Response(
            JSON.stringify({
              items: mockMovies,
              page: 1,
              pageSize: 6,
              total: 1,
              hasMore: false,
              isDemo: true,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }
      if (urlStr.includes('/social')) {
        return Promise.resolve(
          new globalThis.Response(
            JSON.stringify({
              items: mockSocial,
              page: 1,
              pageSize: 6,
              total: 1,
              hasMore: false,
              isDemo: true,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }
      return Promise.reject(new Error(`Unhandled URL in test mock: ${urlStr}`));
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders interleaved content cards from news, movies, and social', async () => {
    renderWithProviders(<UnifiedFeed />);

    await waitFor(() => {
      expect(screen.getByText('Quantum Hardware Breakthrough')).toBeInTheDocument();
      expect(screen.getByText('Dune: Part Two (2024)')).toBeInTheDocument();
      expect(screen.getByText('Elena Rostova (@elena)')).toBeInTheDocument();
    });
  });

  it('allows filtering by source tab (Movies only)', async () => {
    renderWithProviders(<UnifiedFeed />);

    await waitFor(() => {
      expect(screen.getByText('Quantum Hardware Breakthrough')).toBeInTheDocument();
    });

    const movieTab = screen.getByRole('button', { name: /^movies$/i });
    fireEvent.click(movieTab);

    await waitFor(() => {
      expect(screen.getByText('Dune: Part Two (2024)')).toBeInTheDocument();
      expect(screen.queryByText('Quantum Hardware Breakthrough')).not.toBeInTheDocument();
    });
  });

  it('toggles favorite on an item and updates Redux store', async () => {
    const { store } = renderWithProviders(<UnifiedFeed />);

    await waitFor(() => {
      expect(screen.getByText('Quantum Hardware Breakthrough')).toBeInTheDocument();
    });

    const favoriteButtons = screen.getAllByRole('button', { name: /add to favorites/i });
    fireEvent.click(favoriteButtons[0]);

    expect(store.getState().favorites.items).toHaveLength(1);
    expect(store.getState().favorites.items[0].id).toBe('news-quantum');
  });

  it('renders error state and handles retry action', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network failure')));

    renderWithProviders(<UnifiedFeed />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Could not load feed')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('automatically reflects newly published articles without requiring manual refresh', async () => {
    const liveNewArticle: ContentItem = {
      id: 'news-breaking-live',
      source: 'news',
      title: 'Real-time Breaking: Fusion Energy Breakthrough Announced',
      description: 'Clean energy scientists achieve sustained net positive containment.',
      url: 'https://example.com/fusion',
      category: 'science',
      publishedAt: new Date().toISOString(),
      author: 'Global Science Wire',
      isLive: true,
    };

    renderWithProviders(<UnifiedFeed incomingLiveItems={[liveNewArticle]} />);

    await waitFor(() => {
      expect(
        screen.getByText('Real-time Breaking: Fusion Energy Breakthrough Announced')
      ).toBeInTheDocument();
    });
  });

  it('automatically reflects updates to existing articles in place without requiring manual refresh', async () => {
    const updatedQuantumArticle: ContentItem = {
      id: 'news-quantum',
      source: 'news',
      title: 'UPDATED: Quantum Hardware Benchmark Confirmed by Audit',
      description: 'Independent firm validates quantum advantage speedup.',
      url: 'https://example.com/quantum',
      category: 'technology',
      publishedAt: '2026-03-03T10:00:00Z',
      author: 'Tech Reporter',
      isUpdated: true,
    };

    renderWithProviders(
      <UnifiedFeed
        incomingUpdatedItems={[updatedQuantumArticle]}
        latestUpdatedItem={updatedQuantumArticle}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('UPDATED: Quantum Hardware Benchmark Confirmed by Audit')
      ).toBeInTheDocument();
    });
  });
});
