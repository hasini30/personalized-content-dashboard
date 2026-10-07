import { store } from '@/store';
import { toggleCategory, setCategories } from '@/features/preferences/preferencesSlice';
import { toggleFavorite } from '@/features/favorites/favoritesSlice';
import { setThemeMode } from '@/features/theme/themeSlice';
import { ContentItem } from '@/types/content';

describe('Redux Store Foundation', () => {
  it('should initialize with default state', () => {
    const state = store.getState();
    expect(state.preferences.categories).toBeDefined();
    expect(state.preferences.categories.length).toBeGreaterThan(0);
    expect(state.favorites.items).toEqual([]);
    expect(state.theme.mode).toBe('system');
  });

  it('should toggle preferences categories', () => {
    store.dispatch(setCategories(['technology', 'sports']));
    expect(store.getState().preferences.categories).toEqual(['technology', 'sports']);

    store.dispatch(toggleCategory('health'));
    expect(store.getState().preferences.categories).toContain('health');

    store.dispatch(toggleCategory('health'));
    expect(store.getState().preferences.categories).not.toContain('health');
  });

  it('should toggle favorites', () => {
    const mockItem: ContentItem = {
      id: 'item-1',
      source: 'news',
      title: 'Test Headline',
      description: 'Test Description',
      url: 'https://example.com/test',
      category: 'technology',
      publishedAt: '2026-03-01T00:00:00Z',
    };

    store.dispatch(toggleFavorite(mockItem));
    expect(store.getState().favorites.items).toHaveLength(1);
    expect(store.getState().favorites.items[0].id).toBe('item-1');

    store.dispatch(toggleFavorite(mockItem));
    expect(store.getState().favorites.items).toHaveLength(0);
  });

  it('should update theme mode', () => {
    store.dispatch(setThemeMode('dark'));
    expect(store.getState().theme.mode).toBe('dark');
  });
});
