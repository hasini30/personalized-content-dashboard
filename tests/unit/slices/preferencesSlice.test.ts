import preferencesReducer, {
  setCategories,
  toggleCategory,
  setMovieGenres,
  setAutoRefreshInterval,
  setFeedScope,
  setContentLanguage,
  resetPreferences,
  selectFeedScope,
  selectPreferredCategories,
  selectContentLanguage,
  PreferencesState,
} from '@/features/preferences/preferencesSlice';

describe('preferencesSlice', () => {
  const initialState: PreferencesState = {
    categories: ['technology', 'entertainment', 'finance'],
    movieGenres: ['Action', 'Drama', 'Science Fiction'],
    autoRefreshInterval: 30,
    feedScope: 'forYou',
    contentLanguage: 'en',
  };

  it('handles setCategories', () => {
    const state = preferencesReducer(initialState, setCategories(['sports', 'health']));
    expect(state.categories).toEqual(['sports', 'health']);
  });

  it('handles toggleCategory adding and removing down to empty array', () => {
    // Add science
    let state = preferencesReducer(initialState, toggleCategory('science'));
    expect(state.categories).toContain('science');

    // Remove science
    state = preferencesReducer(state, toggleCategory('science'));
    expect(state.categories).not.toContain('science');

    // Remove until empty
    const singleCatState: PreferencesState = {
      ...initialState,
      categories: ['technology'],
    };
    state = preferencesReducer(singleCatState, toggleCategory('technology'));
    // An empty array means "no preference", never "show nothing"
    expect(state.categories).toEqual([]);
  });

  it('handles setFeedScope', () => {
    const state = preferencesReducer(initialState, setFeedScope('all'));
    expect(state.feedScope).toBe('all');
  });

  it('handles setContentLanguage', () => {
    const state = preferencesReducer(initialState, setContentLanguage('hi'));
    expect(state.contentLanguage).toBe('hi');
  });

  it('selectors treat empty preferences appropriately', () => {
    const rootState = {
      preferences: {
        ...initialState,
        categories: [],
        feedScope: 'forYou' as const,
      },
    };
    expect(selectPreferredCategories(rootState)).toEqual([]);
    expect(selectFeedScope(rootState)).toBe('forYou');
    expect(selectContentLanguage(rootState)).toBe('en');

    // Default scope when not explicitly set
    const emptyState = {
      preferences: {
        ...initialState,
        categories: [],
        feedScope: undefined as unknown as 'forYou',
      },
    };
    expect(selectFeedScope(emptyState)).toBe('all');
  });

  it('handles setMovieGenres and setAutoRefreshInterval', () => {
    let state = preferencesReducer(initialState, setMovieGenres(['Comedy', 'Animation']));
    expect(state.movieGenres).toEqual(['Comedy', 'Animation']);

    state = preferencesReducer(state, setAutoRefreshInterval(60));
    expect(state.autoRefreshInterval).toBe(60);
  });

  it('handles resetPreferences', () => {
    const modifiedState: PreferencesState = {
      categories: ['sports'],
      movieGenres: ['Horror'],
      autoRefreshInterval: 0,
      feedScope: 'all',
      contentLanguage: 'te',
    };
    const state = preferencesReducer(modifiedState, resetPreferences());
    expect(state.categories).toEqual(['technology', 'entertainment', 'finance']);
    expect(state.autoRefreshInterval).toBe(30);
    expect(state.feedScope).toBe('forYou');
    expect(state.contentLanguage).toBe('en');
  });
});
