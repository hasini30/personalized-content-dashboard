import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { configureStore } from '@reduxjs/toolkit';
import preferencesReducer from '@/features/preferences/preferencesSlice';
import favoritesReducer from '@/features/favorites/favoritesSlice';
import feedReducer from '@/features/feed/feedSlice';
import themeReducer from '@/features/theme/themeSlice';
import authReducer from '@/features/auth/authSlice';
import { apiSlice } from '@/services/api';
import type { RootState } from '@/store';

export function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      preferences: preferencesReducer,
      favorites: favoritesReducer,
      feed: feedReducer,
      theme: themeReducer,
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    // @ts-expect-error partial preloaded state for tests
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof createTestStore>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren): JSX.Element {
    return (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
