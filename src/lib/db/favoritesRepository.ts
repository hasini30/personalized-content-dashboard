import { getDb } from './database';
import { ContentItem } from '@/types/content';

export interface DbFavoriteRow {
  id: string;
  user_id: string;
  item_id: string;
  item_type: string;
  title: string;
  content_data: string;
  saved_at: string;
}

export function getUserFavorites(userId: string): ContentItem[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT content_data FROM favorites WHERE user_id = ? ORDER BY saved_at DESC'
  );
  const rows = stmt.all(userId) as Record<string, unknown>[];
  return rows.map((r) => JSON.parse(r.content_data as string) as ContentItem);
}

export function addFavorite(userId: string, item: ContentItem): void {
  const db = getDb();
  const id = `fav-${userId}-${item.id}`;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO favorites (id, user_id, item_id, item_type, title, content_data, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, item_id) DO UPDATE SET
      content_data = excluded.content_data,
      saved_at = excluded.saved_at
  `);
  const itemType = item.source || 'news';
  const title = item.title || 'Untitled';
  stmt.run(id, userId, item.id, itemType, title, JSON.stringify(item), now);
}

export function removeFavorite(userId: string, itemId: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM favorites WHERE user_id = ? AND item_id = ?');
  stmt.run(userId, itemId);
}

export function clearFavorites(userId: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM favorites WHERE user_id = ?');
  stmt.run(userId);
}

export function isFavorite(userId: string, itemId: string): boolean {
  const db = getDb();
  const stmt = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND item_id = ?');
  const row = stmt.get(userId, itemId);
  return Boolean(row);
}
