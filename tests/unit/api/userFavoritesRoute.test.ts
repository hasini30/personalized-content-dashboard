import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/user/favorites/route';
import { initDatabase, closeDatabase } from '@/lib/db/database';
import { ContentItem } from '@/types/content';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockImplementation(() =>
    Promise.resolve({
      user: { id: 'user-1', email: 'alex@example.com' },
    })
  ),
}));

describe('User Favorites API Route (/api/user/favorites)', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  const sampleItem: ContentItem = {
    id: 'api-fav-101',
    title: 'Persistent Bookmark Test',
    summary: 'Testing SQLite bookmarking across sessions.',
    source: 'Test Source',
    sourceType: 'news',
    category: 'technology',
    publishedAt: '2026-10-04T12:00:00Z',
    readTime: '1 min',
    url: 'https://feedpulse.local/fav',
  };

  it('saves a favorite item via POST', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/favorites', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        item: sampleItem,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe(sampleItem.id);
  });

  it('retrieves saved favorites via GET', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/favorites?userId=user-1');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.favorites).toHaveLength(1);
    expect(data.favorites[0].id).toBe(sampleItem.id);
  });

  it('removes a favorite item via DELETE', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/user/favorites?userId=user-1&itemId=${sampleItem.id}`,
      { method: 'DELETE' }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const checkReq = new NextRequest('http://localhost:3000/api/user/favorites?userId=user-1');
    const checkRes = await GET(checkReq);
    const data = await checkRes.json();
    expect(data.favorites).toHaveLength(0);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { getServerSession } = jest.requireMock('next-auth');
    getServerSession.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/user/favorites');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('prevents IDOR: rejects attempt to read or modify another user favorites with 403', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/user/favorites?userId=other-user-999'
    );
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(403);

    const postReq = new NextRequest('http://localhost:3000/api/user/favorites', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'other-user-999',
        item: sampleItem,
      }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(403);
  });
});
