import { getDb } from './database';
import { Category, PreferencesState } from '@/features/preferences/preferencesSlice';

export interface DbPreferences {
  user_id: string;
  topics: Category[];
  genres: string[];
  refresh_interval: number;
  stream_enabled: boolean;
  language: string;
  content_language: string;
  updated_at: string;
}

export function getUserPreferences(userId: string): DbPreferences | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM preferences WHERE user_id = ?');
  const row = stmt.get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    user_id: row.user_id as string,
    topics: JSON.parse((row.topics as string) || '[]') as Category[],
    genres: JSON.parse((row.genres as string) || '[]') as string[],
    refresh_interval: Number(row.refresh_interval ?? 30),
    stream_enabled: Boolean(row.stream_enabled),
    language: (row.language as string) || 'en',
    content_language: (row.content_language as string) || 'en',
    updated_at: row.updated_at as string,
  };
}

export function saveUserPreferences(
  userId: string,
  prefs: Partial<PreferencesState> & { streamEnabled?: boolean; language?: string }
): DbPreferences {
  const db = getDb();
  const existing = getUserPreferences(userId);
  const now = new Date().toISOString();

  const topics = prefs.categories ?? existing?.topics ?? ['technology', 'entertainment', 'finance'];
  const genres = prefs.movieGenres ?? existing?.genres ?? ['Action', 'Drama', 'Science Fiction'];
  const refreshInterval = prefs.autoRefreshInterval ?? existing?.refresh_interval ?? 30;
  const streamEnabled = prefs.streamEnabled ?? existing?.stream_enabled ?? true;
  const language = prefs.language ?? existing?.language ?? 'en';
  const contentLanguage = prefs.contentLanguage ?? existing?.content_language ?? 'en';

  const stmt = db.prepare(`
    INSERT INTO preferences (user_id, topics, genres, refresh_interval, stream_enabled, language, content_language, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      topics = excluded.topics,
      genres = excluded.genres,
      refresh_interval = excluded.refresh_interval,
      stream_enabled = excluded.stream_enabled,
      language = excluded.language,
      content_language = excluded.content_language,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    userId,
    JSON.stringify(topics),
    JSON.stringify(genres),
    refreshInterval,
    streamEnabled ? 1 : 0,
    language,
    contentLanguage,
    now
  );

  return {
    user_id: userId,
    topics,
    genres,
    refresh_interval: refreshInterval,
    stream_enabled: streamEnabled,
    language,
    content_language: contentLanguage,
    updated_at: now,
  };
}
