import favoritesReducer, {
  addFavorite,
  removeFavorite,
  toggleFavorite,
  clearFavorites,
  FavoritesState,
} from '@/features/favorites/favoritesSlice';
import { ContentItem } from '@/types/content';

describe('favoritesSlice', () => {
  const mockItem1: ContentItem = {
    id: 'news-1',
    source: 'news',
    title: 'Item 1',
    description: 'Desc 1',
    url: 'https://example.com/1',
    category: 'technology',
    publishedAt: '2026-03-03T00:00:00Z',
  };

  const mockItem2: ContentItem = {
    id: 'movie-2',
    source: 'movie',
    title: 'Item 2',
    description: 'Desc 2',
    url: 'https://example.com/2',
    category: 'entertainment',
    publishedAt: '2026-03-03T00:00:00Z',
  };

  it('handles addFavorite without duplicates', () => {
    let state = favoritesReducer({ items: [] }, addFavorite(mockItem1));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('news-1');

    // Add again
    state = favoritesReducer(state, addFavorite(mockItem1));
    expect(state.items).toHaveLength(1);
  });

  it('handles removeFavorite', () => {
    const initialState: FavoritesState = { items: [mockItem1, mockItem2] };
    const state = favoritesReducer(initialState, removeFavorite('news-1'));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('movie-2');
  });

  it('handles toggleFavorite', () => {
    let state = favoritesReducer({ items: [] }, toggleFavorite(mockItem1));
    expect(state.items).toHaveLength(1);

    state = favoritesReducer(state, toggleFavorite(mockItem1));
    expect(state.items).toHaveLength(0);
  });

  it('handles clearFavorites', () => {
    const state = favoritesReducer({ items: [mockItem1, mockItem2] }, clearFavorites());
    expect(state.items).toEqual([]);
  });
});
