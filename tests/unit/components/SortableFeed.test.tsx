import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { SortableFeed } from '@/components/feed/SortableFeed';
import { ContentItem } from '@/types/content';

const sampleItems: ContentItem[] = [
  {
    id: 'sort-item-1',
    source: 'news',
    title: 'First Sortable Article',
    description: 'First description',
    url: 'https://example.com/1',
    category: 'technology',
    publishedAt: '2026-10-04T12:00:00Z',
  },
  {
    id: 'sort-item-2',
    source: 'movie',
    title: 'Second Sortable Movie',
    description: 'Second description',
    url: 'https://example.com/2',
    category: 'entertainment',
    publishedAt: '2026-10-04T11:00:00Z',
  },
];

describe('SortableFeed Component', () => {
  it('renders sortable items correctly', () => {
    renderWithProviders(<SortableFeed items={sampleItems} />);
    expect(screen.getByText('First Sortable Article')).toBeInTheDocument();
    expect(screen.getByText('Second Sortable Movie')).toBeInTheDocument();
  });
});
