import themeReducer, { setThemeMode, ThemeState } from '@/features/theme/themeSlice';

describe('themeSlice', () => {
  const initialState: ThemeState = { mode: 'system' };

  it('handles setThemeMode to dark and light', () => {
    let state = themeReducer(initialState, setThemeMode('dark'));
    expect(state.mode).toBe('dark');

    state = themeReducer(state, setThemeMode('light'));
    expect(state.mode).toBe('light');

    state = themeReducer(state, setThemeMode('system'));
    expect(state.mode).toBe('system');
  });
});
