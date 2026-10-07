import { getDb } from './database';
import { TranslatedArticlePayload } from '../translation/types';

export interface DbArticleTranslationRow {
  id: string;
  lang: string;
  title: string;
  description: string;
  summary: string | null;
  content: string | null;
  original_title: string;
  original_description: string;
  original_content: string | null;
  updated_at: string;
}

/**
 * Normalizes title for content-based cross-article cache lookup.
 */
function normalizeTitle(title: string): string {
  return (title || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function getCachedArticleTranslation(
  articleId: string,
  lang: string
): TranslatedArticlePayload | null {
  try {
    const db = getDb();
    const stmt = db.prepare(
      'SELECT id, lang, title, description, content, original_title, original_description, original_content FROM article_translations WHERE id = ? AND lang = ?'
    );
    const row = stmt.get(articleId, lang.toLowerCase().trim()) as
      DbArticleTranslationRow | undefined;

    if (!row) return null;

    return {
      title: row.title,
      description: row.description,
      content: row.content || undefined,
      isTranslated: true,
      language: row.lang,
      originalTitle: row.original_title,
      originalDescription: row.original_description,
      originalContent: row.original_content || undefined,
    };
  } catch {
    return null;
  }
}

export function getCachedTranslationByOriginalTitle(
  originalTitle: string,
  lang: string
): TranslatedArticlePayload | null {
  try {
    const norm = normalizeTitle(originalTitle);
    if (!norm) return null;

    const db = getDb();
    const stmt = db.prepare(
      'SELECT title, description, content, original_title, original_description, original_content, lang FROM article_translations WHERE lang = ? ORDER BY updated_at DESC'
    );
    const rows = stmt.all(lang.toLowerCase().trim()) as unknown as DbArticleTranslationRow[];

    for (const row of rows) {
      if (normalizeTitle(row.original_title) === norm) {
        return {
          title: row.title,
          description: row.description,
          content: row.content || undefined,
          isTranslated: true,
          language: row.lang,
          originalTitle: row.original_title,
          originalDescription: row.original_description,
          originalContent: row.original_content || undefined,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedArticleTranslation(
  articleId: string,
  payload: TranslatedArticlePayload
): void {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO article_translations (
        id, lang, title, description, summary, content, original_title, original_description, original_content, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, lang) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        summary = excluded.summary,
        content = excluded.content,
        original_title = excluded.original_title,
        original_description = excluded.original_description,
        original_content = excluded.original_content,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      articleId,
      payload.language.toLowerCase().trim(),
      payload.title,
      payload.description,
      null,
      payload.content || null,
      payload.originalTitle || payload.title,
      payload.originalDescription || payload.description,
      payload.originalContent || payload.content || null,
      now
    );
  } catch {
    // Fail safe on database errors
  }
}

export function setCachedArticleTranslationsBatch(
  items: Array<{ articleId: string; payload: TranslatedArticlePayload }>
): void {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO article_translations (
        id, lang, title, description, summary, content, original_title, original_description, original_content, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, lang) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        content = excluded.content,
        original_title = excluded.original_title,
        original_description = excluded.original_description,
        original_content = excluded.original_content,
        updated_at = excluded.updated_at
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const item of items) {
        stmt.run(
          item.articleId,
          item.payload.language.toLowerCase().trim(),
          item.payload.title,
          item.payload.description,
          null,
          item.payload.content || null,
          item.payload.originalTitle || item.payload.title,
          item.payload.originalDescription || item.payload.description,
          item.payload.originalContent || item.payload.content || null,
          now
        );
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch {
    // Fail safe on batch insert errors
  }
}

export function clearCachedTranslations(lang?: string): void {
  try {
    const db = getDb();
    if (lang) {
      const stmt = db.prepare('DELETE FROM article_translations WHERE lang = ?');
      stmt.run(lang.toLowerCase().trim());
    } else {
      db.exec('DELETE FROM article_translations;');
    }
  } catch {
    // Ignore error
  }
}
