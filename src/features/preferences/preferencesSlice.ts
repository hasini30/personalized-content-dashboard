import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const AVAILABLE_CATEGORIES = [
  'technology',
  'entertainment',
  'finance',
  'sports',
  'health',
  'science',
  'business',
  'general',
  'politics',
  'world',
  'environment',
  'education',
] as const;

export type Category = (typeof AVAILABLE_CATEGORIES)[number];

export interface PreferencesState {
  categories: Category[];
  movieGenres: string[];
  autoRefreshInterval: number; // in seconds, 0 = off
  feedScope: 'forYou' | 'all';
  contentLanguage: string;
  followedPublishers?: string[];
}

const initialState: PreferencesState = {
  categories: ['technology', 'entertainment', 'finance'],
  movieGenres: ['Action', 'Drama', 'Science Fiction'],
  autoRefreshInterval: 30,
  feedScope: 'forYou',
  contentLanguage: 'en',
  followedPublishers: [
    'BBC News',
    'Reuters',
    'The Hindu',
    'Times of India',
    'TechCrunch',
    'The Guardian',
  ],
};

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    toggleCategory: (state, action: PayloadAction<Category>) => {
      const cat = action.payload;
      if (state.categories.includes(cat)) {
        // Allow removing down to empty array (empty means no preference / show all)
        state.categories = state.categories.filter((c) => c !== cat);
      } else {
        state.categories.push(cat);
      }
    },
    setMovieGenres: (state, action: PayloadAction<string[]>) => {
      state.movieGenres = action.payload;
    },
    setAutoRefreshInterval: (state, action: PayloadAction<number>) => {
      state.autoRefreshInterval = action.payload;
    },
    setFeedScope: (state, action: PayloadAction<'forYou' | 'all'>) => {
      state.feedScope = action.payload;
    },
    setContentLanguage: (state, action: PayloadAction<string>) => {
      state.contentLanguage = action.payload;
    },
    setFollowedPublishers: (state, action: PayloadAction<string[]>) => {
      state.followedPublishers = action.payload;
    },
    toggleFollowedPublisher: (state, action: PayloadAction<string>) => {
      const pub = action.payload;
      const current = state.followedPublishers || [];
      if (current.includes(pub)) {
        state.followedPublishers = current.filter((p) => p !== pub);
      } else {
        state.followedPublishers = [...current, pub];
      }
    },
    resetPreferences: () => initialState,
  },
});

export const {
  setCategories,
  toggleCategory,
  setMovieGenres,
  setAutoRefreshInterval,
  setFeedScope,
  setContentLanguage,
  setFollowedPublishers,
  toggleFollowedPublisher,
  resetPreferences,
} = preferencesSlice.actions;

export const selectPreferredCategories = (state: { preferences: PreferencesState }) =>
  state.preferences.categories;

export const selectFeedScope = (state: { preferences: PreferencesState }) =>
  state.preferences.feedScope || (state.preferences.categories.length > 0 ? 'forYou' : 'all');

export const selectContentLanguage = (state: { preferences: PreferencesState }) =>
  state.preferences.contentLanguage || 'en';

export const selectFollowedPublishers = (state: { preferences: PreferencesState }) =>
  state.preferences.followedPublishers || [];

export default preferencesSlice.reducer;
