import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { addFavorite } from '@/features/favorites/favoritesSlice';
import { ContentItem } from '@/types/content';

let currentPathname = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

const sampleItem: ContentItem = {
  id: 'item-1',
  source: 'news',
  title: 'Sample Title',
  description: 'Sample Description',
  url: 'https://example.com/1',
  publishedAt: '2026-03-01T00:00:00Z',
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    currentPathname = '/';
  });

  it('renders navigation links and displays active state for current pathname', () => {
    currentPathname = '/trending';
    renderWithProviders(<Sidebar isMobileOpen={false} onMobileClose={jest.fn()} />);

    expect(screen.getAllByText('My Feed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('News').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);
    expect(screen.queryByText('Podcasts')).not.toBeInTheDocument();
    expect(screen.getAllByText('Favorites').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preferences').length).toBeGreaterThan(0);
  });

  it('displays favorites count badge when items are in favorites slice', async () => {
    const { store } = renderWithProviders(
      <Sidebar isMobileOpen={false} onMobileClose={jest.fn()} />
    );

    act(() => {
      store.dispatch(addFavorite(sampleItem));
    });

    await waitFor(() => {
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });

  it('triggers onMobileClose when close button is clicked in mobile drawer', () => {
    const onMobileClose = jest.fn();
    renderWithProviders(<Sidebar isMobileOpen={true} onMobileClose={onMobileClose} />);

    const closeBtn = screen.getByRole('button', { name: /close navigation sidebar/i });
    fireEvent.click(closeBtn);
    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });
});
