import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let instance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test' && !process.env.PERSIST_TEST_DB) {
    return ':memory:';
  }
  if (process.env.DATABASE_PATH) {
    const customDir = path.dirname(process.env.DATABASE_PATH);
    try {
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }
      return process.env.DATABASE_PATH;
    } catch {
      return path.join('/tmp', 'feedpulse.sqlite');
    }
  }
  // Vercel serverless environments provide write access in /tmp
  if (process.env.VERCEL) {
    return path.join('/tmp', 'feedpulse.sqlite');
  }
  const baseDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    return path.join(baseDir, 'feedpulse.sqlite');
  } catch {
    return path.join('/tmp', 'feedpulse.sqlite');
  }
}

export function initDatabase(dbPath?: string): DatabaseSync {
  const targetPath = dbPath || getDatabasePath();
  const db = new DatabaseSync(targetPath);

  // Enable WAL mode and foreign keys for high concurrent performance & integrity
  db.exec('PRAGMA foreign_keys = ON;');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'FeedPulse Member',
      avatar TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preferences (
      user_id TEXT PRIMARY KEY,
      topics TEXT NOT NULL,
      genres TEXT NOT NULL,
      refresh_interval INTEGER NOT NULL DEFAULT 30000,
      stream_enabled INTEGER NOT NULL DEFAULT 1,
      language TEXT NOT NULL DEFAULT 'en',
      content_language TEXT NOT NULL DEFAULT 'en',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content_data TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      UNIQUE(user_id, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rss_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      published_at TEXT NOT NULL,
      image_url TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      author TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_rss_articles_published_at ON rss_articles(published_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_rss_articles_category ON rss_articles(category);
    CREATE INDEX IF NOT EXISTS idx_rss_articles_source ON rss_articles(source);

    CREATE TABLE IF NOT EXISTS article_translations (
      id TEXT NOT NULL,
      lang TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      original_title TEXT,
      original_description TEXT,
      original_content TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, lang)
    );

    CREATE INDEX IF NOT EXISTS idx_article_translations_lang ON article_translations(lang);
    CREATE INDEX IF NOT EXISTS idx_article_translations_orig_title ON article_translations(original_title);
  `);

  // Ensure updated_at column exists for databases created before this migration
  try {
    db.exec('ALTER TABLE rss_articles ADD COLUMN updated_at TEXT;');
  } catch {
    // Already exists
  }

  // Seed default demo users if not present
  seedDefaultUsers(db);

  return db;
}

function seedDefaultUsers(db: DatabaseSync): void {
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
  const alexExists = (checkStmt.get('alex@example.com') as { count: number })?.count > 0;
  if (!alexExists) {
    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, avatar, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    insertStmt.run(
      'user-1',
      'Alex Rivera',
      'alex@example.com',
      'password123',
      'Senior Software Architect',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Passionate about distributed reactive systems, quantum computing, and sci-fi cinema.',
      now,
      now
    );
  }

  const priyaExists = (checkStmt.get('priya@example.com') as { count: number })?.count > 0;
  if (!priyaExists) {
    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, avatar, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    insertStmt.run(
      'user-2',
      'Priya Sharma',
      'priya@example.com',
      'password123',
      'Quantitative Finance & Media Curator',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'Tracking global macroeconomic shifts, renewable energy markets, and international film festivals.',
      now,
      now
    );
  }

  const guestExists = (checkStmt.get('guest@feedpulse.local') as { count: number })?.count > 0;
  if (!guestExists) {
    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, avatar, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    insertStmt.run(
      'guest',
      'Guest Explorer',
      'guest@feedpulse.local',
      'guestpass',
      'FeedPulse Guest',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Exploring personalized content as a guest.',
      now,
      now
    );
  }
}

export function getDb(): DatabaseSync {
  if (!instance) {
    instance = initDatabase();
  }
  return instance;
}

export function closeDatabase(): void {
  if (instance) {
    try {
      instance.close();
    } catch {
      // Ignore error if already closed
    }
    instance = null;
  }
}
