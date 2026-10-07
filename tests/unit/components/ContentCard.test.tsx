import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { ContentCard } from '@/components/cards/ContentCard';
import { renderWithProviders } from '../../test-utils';
import { ContentItem } from '@/types/content';

describe('ContentCard component', () => {
  const newsItem: ContentItem = {
    id: 'news-123',
    source: 'news',
    title: 'Breakthrough in AI Research',
    description: 'Researchers have announced a novel method for neural synthesis.',
    url: 'https://example.com/ai-news',
    imageUrl: 'https://example.com/ai.jpg',
    category: 'technology',
    publishedAt: '2026-03-03T10:00:00Z',
    author: 'Tech Daily',
    hashtags: ['ai', 'tech'],
    isDemo: true,
  };

  it('renders news card with headline, description, author, and easy summary badge', () => {
    renderWithProviders(<ContentCard item={newsItem} />);

    expect(screen.getByText('Breakthrough in AI Research')).toBeInTheDocument();
    expect(
      screen.getByText('Researchers have announced a novel method for neural synthesis.')
    ).toBeInTheDocument();
    expect(screen.getByText('Tech Daily')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByText('Easy Summary')).toBeInTheDocument();

    const readSummaryBtn = screen.getByRole('button', { name: /read summary/i });
    expect(readSummaryBtn).toBeInTheDocument();
    // Must NOT be an anchor link redirecting externally
    expect(readSummaryBtn.tagName).toBe('BUTTON');
  });

  it('renders movie CTA for movie source items', () => {
    const movieItem: ContentItem = {
      ...newsItem,
      id: 'movie-456',
      source: 'movie',
      title: 'Inception (2010)',
    };

    renderWithProviders(<ContentCard item={movieItem} />);
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });

  it('toggles favorite on click', () => {
    const { store } = renderWithProviders(<ContentCard item={newsItem} />);

    const favButton = screen.getByRole('button', { name: /add to favorites/i });
    fireEvent.click(favButton);

    expect(store.getState().favorites.items).toHaveLength(1);
    expect(store.getState().favorites.items[0].id).toBe('news-123');

    fireEvent.click(favButton);
    expect(store.getState().favorites.items).toHaveLength(0);
  });

  it('opens in-app reader modal on click and displays understandable summary and full article content', () => {
    const fullStoryItem: ContentItem = {
      ...newsItem,
      content:
        'Full comprehensive journalistic article body discussing neural synthesis breakthroughs.',
    };

    renderWithProviders(<ContentCard item={fullStoryItem} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const readSummaryBtn = screen.getByRole('button', { name: /read summary/i });
    fireEvent.click(readSummaryBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/In Plain English/i)).toBeInTheDocument();
    expect(screen.getByText(/Key Takeaways/i)).toBeInTheDocument();

    // Switch to detailed story
    const detailedTab = screen.getByRole('button', { name: /detailed story/i });
    fireEvent.click(detailedTab);

    expect(
      screen.getByText(
        /Full comprehensive journalistic article body discussing neural synthesis breakthroughs./i
      )
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close reader/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders UPDATED badge when an existing article is updated by a source', () => {
    const updatedItem: ContentItem = {
      ...newsItem,
      title: 'Breakthrough in AI Research (Revised Edition)',
      isUpdated: true,
      updatedAt: '2026-10-06T12:00:00Z',
    };

    renderWithProviders(<ContentCard item={updatedItem} />);
    expect(screen.getByText('UPDATED')).toBeInTheDocument();
  });
});
