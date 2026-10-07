import { getDb } from './database';
import { hashPassword } from '../security/password';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  avatar: string;
  bio: string;
  created_at: string;
  updated_at: string;
}

export function getUserByEmail(email: string): DbUser | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
  const row = stmt.get(email.trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return row as unknown as DbUser;
}

export function getUserById(id: string): DbUser | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return row as unknown as DbUser;
}

export function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  avatar?: string;
  bio?: string;
}): DbUser {
  const db = getDb();
  const email = data.email.toLowerCase().trim();
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const role = data.role?.trim() || 'FeedPulse Member';
  const avatar =
    data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
  const bio = data.bio?.trim() || 'Active member exploring personalized content.';
  const rawPassword = data.password || 'password123';
  const password = rawPassword.startsWith('pbkdf2$') ? rawPassword : hashPassword(rawPassword);

  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, password, role, avatar, bio, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.name.trim(), email, password, role, avatar, bio, now, now);

  return {
    id,
    name: data.name.trim(),
    email,
    password,
    role,
    avatar,
    bio,
    created_at: now,
    updated_at: now,
  };
}

export function updateUser(
  id: string,
  updates: Partial<Pick<DbUser, 'name' | 'role' | 'avatar' | 'bio'>>
): DbUser | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();
  const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
  const newRole = updates.role !== undefined ? updates.role.trim() : existing.role;
  const newAvatar = updates.avatar !== undefined ? updates.avatar : existing.avatar;
  const newBio = updates.bio !== undefined ? updates.bio.trim() : existing.bio;

  const stmt = db.prepare(`
    UPDATE users 
    SET name = ?, role = ?, avatar = ?, bio = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(newName, newRole, newAvatar, newBio, now, id);

  return {
    ...existing,
    name: newName,
    role: newRole,
    avatar: newAvatar,
    bio: newBio,
    updated_at: now,
  };
}

export function getAllUsers(): DbUser[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT id, name, email, role, avatar, bio, created_at, updated_at FROM users'
  );
  return stmt.all() as unknown as DbUser[];
}
