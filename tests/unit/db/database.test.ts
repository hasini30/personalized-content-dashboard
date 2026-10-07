import { initDatabase, closeDatabase } from '@/lib/db/database';
import {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  getAllUsers,
} from '@/lib/db/userRepository';
import { getUserPreferences, saveUserPreferences } from '@/lib/db/preferencesRepository';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  clearFavorites,
  isFavorite,
} from '@/lib/db/favoritesRepository';
import { ContentItem } from '@/types/content';

describe('SQLite Database & Repositories', () => {
  beforeAll(() => {
    // Initialize in-memory SQLite database
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('User Repository', () => {
    it('seeds default users (Alex & Priya) on initialization', () => {
      const alex = getUserByEmail('alex@example.com');
      expect(alex).not.toBeNull();
      expect(alex?.name).toBe('Alex Rivera');
      expect(alex?.role).toContain('Architect');

      const priya = getUserByEmail('priya@example.com');
      expect(priya).not.toBeNull();
      expect(priya?.name).toBe('Priya Sharma');
    });

    it('performs case-insensitive email lookup', () => {
      const alexUpper = getUserByEmail('ALEX@EXAMPLE.COM');
      expect(alexUpper).not.toBeNull();
      expect(alexUpper?.id).toBe('user-1');
    });

    it('returns null for non-existent users', () => {
      const user = getUserByEmail('nobody@example.com');
      expect(user).toBeNull();

      const userById = getUserById('non-existent-id');
      expect(userById).toBeNull();
    });

    it('creates a new user and retrieves it by id and email', () => {
      const testEmail = `newuser_${Date.now()}@example.com`;
      const created = createUser({
        name: 'New Test User',
        email: testEmail,
        password: 'securepass123',
        role: 'Data Scientist',
        bio: 'Machine learning specialist',
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('New Test User');
      expect(created.email).toBe(testEmail.toLowerCase());

      const fetchedByEmail = getUserByEmail(testEmail);
      expect(fetchedByEmail).not.toBeNull();
      expect(fetchedByEmail?.role).toBe('Data Scientist');

      const fetchedById = getUserById(created.id);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.bio).toBe('Machine learning specialist');
    });

    it('updates user profile fields', () => {
      const testEmail = `update_${Date.now()}@example.com`;
      const created = createUser({
        name: 'Before Update',
        email: testEmail,
      });

      const updated = updateUser(created.id, {
        name: 'After Update',
        bio: 'Updated bio information',
        role: 'Lead Designer',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('After Update');
      expect(updated?.bio).toBe('Updated bio information');
      expect(updated?.role).toBe('Lead Designer');

      const nonExistent = updateUser('bad-id', { name: 'Nobody' });
      expect(nonExistent).toBeNull();
    });

    it('lists all users with getAllUsers', () => {
      const users = getAllUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users.some((u) => u.email === 'alex@example.com')).toBe(true);
    });
  });

  describe('Preferences Repository', () => {
    it('returns null when no preferences exist for a user', () => {
      const prefs = getUserPreferences('unknown-user-id');
      expect(prefs).toBeNull();
    });

    it('saves and retrieves preferences for a user', () => {
      const userId = 'user-1';
      const saved = saveUserPreferences(userId, {
        categories: ['technology', 'science'],
        movieGenres: ['Sci-Fi', 'Documentary'],
        autoRefreshInterval: 45,
        feedScope: 'forYou',
        contentLanguage: 'hi',
        streamEnabled: true,
        language: 'hi',
      });

      expect(saved.user_id).toBe(userId);
      expect(saved.topics).toEqual(['technology', 'science']);
      expect(saved.refresh_interval).toBe(45);
      expect(saved.content_language).toBe('hi');

      const fetched = getUserPreferences(userId);
      expect(fetched).not.toBeNull();
      expect(fetched?.genres).toEqual(['Sci-Fi', 'Documentary']);
      expect(fetched?.stream_enabled).toBe(true);
    });

    it('updates preferences on conflict (ON CONFLICT DO UPDATE)', () => {
      const userId = 'user-1';
      saveUserPreferences(userId, {
        categories: ['health', 'finance'],
        autoRefreshInterval: 60,
      });

      const updated = getUserPreferences(userId);
      expect(updated?.topics).toEqual(['health', 'finance']);
      expect(updated?.refresh_interval).toBe(60);
    });
  });

  describe('Favorites Repository', () => {
    const mockItem: ContentItem = {
      id: 'news-test-101',
      title: 'Persistent Database Tested Successfully',
      summary: 'FeedPulse now runs with embedded SQLite persistence.',
      source: 'FeedPulse Tech',
      sourceType: 'news',
      category: 'technology',
      publishedAt: '2026-10-04T12:00:00Z',
      readTime: '2 min read',
      url: 'https://feedpulse.local/db-test',
    };

    it('adds and verifies favorite items', () => {
      const userId = 'user-1';
      expect(isFavorite(userId, mockItem.id)).toBe(false);

      addFavorite(userId, mockItem);
      expect(isFavorite(userId, mockItem.id)).toBe(true);

      const favorites = getUserFavorites(userId);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe(mockItem.id);
      expect(favorites[0].title).toBe(mockItem.title);
    });

    it('removes a specific favorite item', () => {
      const userId = 'user-1';
      removeFavorite(userId, mockItem.id);
      expect(isFavorite(userId, mockItem.id)).toBe(false);

      const favorites = getUserFavorites(userId);
      expect(favorites).toHaveLength(0);
    });

    it('clears all favorites for a user', () => {
      const userId = 'user-2';
      const item2: ContentItem = { ...mockItem, id: 'news-test-102', title: 'Second Item' };
      addFavorite(userId, mockItem);
      addFavorite(userId, item2);

      expect(getUserFavorites(userId)).toHaveLength(2);
      clearFavorites(userId);
      expect(getUserFavorites(userId)).toHaveLength(0);
    });
  });
});
