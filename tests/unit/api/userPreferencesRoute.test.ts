import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/user/preferences/route';
import { initDatabase, closeDatabase } from '@/lib/db/database';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockImplementation(() =>
    Promise.resolve({
      user: { id: 'user-1', email: 'alex@example.com' },
    })
  ),
}));

describe('User Preferences API Route (/api/user/preferences)', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('saves preferences for user via POST', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        categories: ['technology', 'sports'],
        movieGenres: ['Action', 'Comedy'],
        autoRefreshInterval: 60,
        feedScope: 'forYou',
        contentLanguage: 'ta',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.preferences).toBeDefined();
    expect(data.preferences.topics).toEqual(['technology', 'sports']);
    expect(data.preferences.content_language).toBe('ta');
  });

  it('fetches saved preferences via GET', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/preferences?userId=user-1');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.preferences.user_id).toBe('user-1');
    expect(data.preferences.topics).toEqual(['technology', 'sports']);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { getServerSession } = jest.requireMock('next-auth');
    getServerSession.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/user/preferences');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('prevents IDOR: rejects attempt to read or modify another user preferences with 403', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/user/preferences?userId=other-user-999'
    );
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(403);

    const postReq = new NextRequest('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'other-user-999',
        categories: ['politics'],
      }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(403);
  });
});
