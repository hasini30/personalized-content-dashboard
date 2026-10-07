'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  AVAILABLE_CATEGORIES,
  Category,
  toggleCategory,
  setMovieGenres,
  setAutoRefreshInterval,
  setContentLanguage,
  resetPreferences,
} from '@/features/preferences/preferencesSlice';
import { Sliders, CheckCircle2, RotateCcw, Film, Cpu, Clock, Globe, Languages } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { useTranslation } from 'react-i18next';

const MOVIE_GENRES_OPTIONS = [
  'Action',
  'Adventure',
  'Science Fiction',
  'Comedy',
  'Drama',
  'Animation',
  'Thriller',
  'Romance',
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.preferences);
  const [savedFeedback, setSavedFeedback] = React.useState(false);

  const handleCategoryToggle = (category: Category) => {
    dispatch(toggleCategory(category));
    triggerFeedback();
  };

  const handleGenreToggle = (genre: string) => {
    const current = preferences.movieGenres;
    let updated: string[];
    if (current.includes(genre)) {
      if (current.length > 1) {
        updated = current.filter((g) => g !== genre);
      } else {
        updated = current;
      }
    } else {
      updated = [...current, genre];
    }
    dispatch(setMovieGenres(updated));
    triggerFeedback();
  };

  const handleContentLanguageChange = (code: string) => {
    dispatch(setContentLanguage(code));
    triggerFeedback();
  };

  const triggerFeedback = () => {
    setSavedFeedback(true);
    // Sync to SQLite Database
    fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: preferences.categories,
        movieGenres: preferences.movieGenres,
        autoRefreshInterval: preferences.autoRefreshInterval,
        contentLanguage: preferences.contentLanguage,
      }),
    }).catch(() => {});

    setTimeout(() => {
      setSavedFeedback(false);
    }, 2000);
  };

  const handleReset = () => {
    dispatch(resetPreferences());
    triggerFeedback();
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('settings.title') || 'Feed Preferences'}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('settings.subtitle') ||
                'Customize your topics, genres, and refresh cadence. Changes persist and automatically update your feed.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedFeedback && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t('settings.saved') || 'Preferences Saved'}</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('settings.resetDefaults') || 'Reset Defaults'}</span>
            </Button>
          </div>
        </div>

        {/* Content Topics & News Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {t('settings.topicsTitle') || 'Prioritize these topics'}
              </CardTitle>
            </div>
            <CardDescription>
              {t('settings.topicsDesc') ||
                'You can always browse all news from the News page or the All News tab.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AVAILABLE_CATEGORIES.map((cat) => {
                const isSelected = preferences.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm capitalize font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* News & Content Translation Language */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-base">
                {t('settings.contentLanguage') || 'News & Content Language'}
              </CardTitle>
            </div>
            <CardDescription>
              {t('settings.contentLanguageDesc') ||
                'Choose the language for translated news stories. News content is translated server-side into this language.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = (preferences.contentLanguage || 'en') === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleContentLanguageChange(lang.code)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/30'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-foreground">{lang.nativeName}</span>
                      <span className="text-xs text-muted-foreground block">
                        {lang.name} ({lang.short})
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Movie Genres */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">
                {t('settings.genresTitle') || 'Movie & Entertainment Genres'}
              </CardTitle>
            </div>
            <CardDescription>
              {t('settings.genresDesc') ||
                'Choose movie genres you love to see in cinema recommendations.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOVIE_GENRES_OPTIONS.map((genre) => {
                const isSelected = preferences.movieGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/30'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{genre}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Cadence */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">
                {t('settings.streamTitle') || 'Real-time Stream & Updates'}
              </CardTitle>
            </div>
            <CardDescription>
              {t('settings.streamDesc') || 'Configure live Server-Sent Events push notifications.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              checked={preferences.autoRefreshInterval > 0}
              onChange={(enabled) => {
                dispatch(setAutoRefreshInterval(enabled ? 30 : 0));
                triggerFeedback();
              }}
              label={t('settings.streamToggle') || 'Enable Real-Time SSE Stream'}
              description={
                t('settings.streamToggleDesc') ||
                'Automatically receive live update pills when fresh breaking news or social posts emerge.'
              }
            />
          </CardContent>
        </Card>

        {/* Interface Language */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">
                {t('settings.language') || 'Interface Language'}
              </CardTitle>
            </div>
            <CardDescription>
              {t('settings.languageDesc') ||
                'Choose your preferred display language for UI labels.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Active Interface Language</p>
                <p className="text-xs text-muted-foreground">
                  Updates headers, buttons, navigation, and settings text immediately.
                </p>
              </div>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
