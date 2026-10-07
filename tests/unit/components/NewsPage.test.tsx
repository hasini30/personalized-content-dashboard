import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import NewsPage from '@/app/(dashboard)/news/page';
import { ContentItem } from '@/types/content';

const mockNews: ContentItem[] = [
  {
    id: 'news-1',
    source: 'news',
    title: 'Breakthrough in Clean Energy Storage',
    description: 'Next-generation solid-state battery technology reaches commercial viability.',
    url: 'https://news.example.com/energy-1',
    category: 'technology',
    publishedAt: '2026-10-04T10:00:00Z',
    author: 'Tech Wire',
  },
  {
    id: 'news-2',
    source: 'news',
    title: 'Global Markets Rally on Rate Cuts',
    description: 'Central banks ease monetary policy as inflation stabilizes.',
    url: 'https://news.example.com/markets-2',
    category: 'business',
    publishedAt: '2026-10-04T09:00:00Z',
    author: 'Market Watch',
  },
];

let mockQueryReturn: {
  data?: {
    items: ContentItem[];
    total: number;
    hasMore: boolean;
    isDemo: boolean;
    page: number;
    pageSize: number;
  };
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: jest.Mock;
} = {
  data: { items: mockNews, total: 2, hasMore: false, isDemo: true, page: 1, pageSize: 12 },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};

let mockEventSourceReturn = {
  newItems: [] as ContentItem[],
  updatedItems: [] as ContentItem[],
  latestUpdatedItem: null as ContentItem | null,
  isConnected: true,
  mergeNewItems: jest.fn(),
  clearNewItems: jest.fn(),
  clearUpdatedItems: jest.fn(),
};

jest.mock('@/hooks/useEventSource', () => ({
  useEventSource: () => mockEventSourceReturn,
}));

jest.mock('@/services/api', () => {
  const actual = jest.requireActual('@/services/api');
  return {
    ...actual,
    useGetNewsQuery: () => mockQueryReturn,
  };
});

describe('NewsPage Component', () => {
  beforeEach(() => {
    mockQueryReturn = {
      data: { items: mockNews, total: 2, hasMore: false, isDemo: true, page: 1, pageSize: 12 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    };
  });

  it('renders page header, search input, category chips, and news cards', () => {
    renderWithProviders(<NewsPage />);

    expect(screen.getByRole('heading', { name: /global news explorer/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search all global news by topic, headline, or keywords/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all news/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /technology/i })).toBeInTheDocument();

    expect(screen.getByText('Breakthrough in Clean Energy Storage')).toBeInTheDocument();
    expect(screen.getByText('Global Markets Rally on Rate Cuts')).toBeInTheDocument();
  });

  it('allows clicking category chips to filter news', () => {
    renderWithProviders(<NewsPage />);

    const techChip = screen.getByRole('button', { name: /technology/i });
    fireEvent.click(techChip);

    expect(techChip).toHaveClass('bg-primary');
  });

  it('renders initial error state with retry button when initial load fails', () => {
    const mockRefetch = jest.fn();
    mockQueryReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mockRefetch,
    };

    renderWithProviders(<NewsPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load news')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles search input change', async () => {
    renderWithProviders(<NewsPage />);

    const searchInput = screen.getByPlaceholderText(
      /search all global news by topic, headline, or keywords/i
    );
    fireEvent.change(searchInput, { target: { value: 'battery' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('battery');
    });
  });

  it('automatically reflects newly published articles without requiring manual page refresh', async () => {
    const liveItem: ContentItem = {
      id: 'news-live-incoming',
      source: 'news',
      title: 'LIVE: Commercial Fusion Reactor Commissioned in France',
      description: 'Grid synchronization begins for 500MW continuous pilot facility.',
      url: 'https://news.example.com/fusion-live',
      category: 'science',
      publishedAt: new Date().toISOString(),
      author: 'Global Science Wire',
      isLive: true,
    };

    mockEventSourceReturn = {
      ...mockEventSourceReturn,
      newItems: [liveItem],
    };

    renderWithProviders(<NewsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('LIVE: Commercial Fusion Reactor Commissioned in France')
      ).toBeInTheDocument();
    });
  });

  it('automatically reflects updated articles in place without requiring manual page refresh', async () => {
    const updatedArticle: ContentItem = {
      id: 'news-1',
      source: 'news',
      title: 'UPDATED: Clean Energy Storage Reaches 100% Commercial Grid Rollout',
      description: 'Next-generation solid-state battery technology reaches commercial viability.',
      url: 'https://news.example.com/energy-1',
      category: 'technology',
      publishedAt: '2026-10-04T10:00:00Z',
      author: 'Tech Wire',
      isUpdated: true,
    };

    mockEventSourceReturn = {
      ...mockEventSourceReturn,
      newItems: [],
      updatedItems: [updatedArticle],
      latestUpdatedItem: updatedArticle,
    };

    renderWithProviders(<NewsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('UPDATED: Clean Energy Storage Reaches 100% Commercial Grid Rollout')
      ).toBeInTheDocument();
    });
  });
});
