import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/user/profile/route';
import { initDatabase, closeDatabase } from '@/lib/db/database';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockImplementation(() =>
    Promise.resolve({
      user: { id: 'user-1', email: 'alex@example.com', name: 'Alex Rivera' },
    })
  ),
}));

describe('User Profile API Route (/api/user/profile)', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('retrieves user profile from session', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/profile');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('alex@example.com');
    expect(data.user.name).toBe('Alex Rivera');
    expect(data.user.password).toBeUndefined(); // password not exposed
  });

  it('rejects unauthenticated profile request with 401', async () => {
    const { getServerSession } = jest.requireMock('next-auth');
    getServerSession.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/user/profile');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('updates authenticated user profile via PUT', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Edited Alex Rivera',
        role: 'Principal Engineer',
        bio: 'Updated bio in API test',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.name).toBe('Edited Alex Rivera');
    expect(data.user.role).toBe('Principal Engineer');
    expect(data.user.bio).toBe('Updated bio in API test');
  });

  it('prevents IDOR: returns 403 when trying to modify another user profile', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        userId: 'victim-user-id',
        name: 'Hacked Name',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('returns 404 when session user is not found in database', async () => {
    const { getServerSession } = jest.requireMock('next-auth');
    getServerSession.mockResolvedValueOnce({
      user: { id: 'non-existent-user-id', email: 'ghost@example.com' },
    });

    const req = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Ghost',
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(404);
  });
});
