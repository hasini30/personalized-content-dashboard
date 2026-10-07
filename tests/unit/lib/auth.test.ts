import { authOptions, MOCK_USERS } from '@/lib/auth';
import type { User } from 'next-auth';

interface ExtendedUser extends User {
  id: string;
  role?: string;
  bio?: string;
}

interface ProviderWithOptions {
  options: {
    authorize: (
      credentials: Record<string, string> | null
    ) => Promise<Record<string, unknown> | null>;
  };
}

describe('Auth Configuration and Provider', () => {
  const credentialsProvider = authOptions.providers[0] as unknown as ProviderWithOptions;
  const authorize = credentialsProvider.options.authorize;

  it('contains configured mock users', () => {
    expect(MOCK_USERS['alex@example.com']).toBeDefined();
    expect(MOCK_USERS['alex@example.com'].name).toBe('Alex Rivera');
    expect(MOCK_USERS['priya@example.com']).toBeDefined();
  });

  it('exports a valid non-empty AUTH_SECRET and configures it in authOptions', () => {
    expect(authOptions.secret).toBeDefined();
    expect(typeof authOptions.secret).toBe('string');
    expect((authOptions.secret as string).length).toBeGreaterThan(16);
  });

  it('authorizes valid mock credentials successfully', async () => {
    const user = await authorize({
      email: 'alex@example.com',
      password: 'password123',
    });

    expect(user).not.toBeNull();
    expect(user?.name).toBe('Alex Rivera');
    expect(user?.role).toBe('Senior Software Architect');
  });

  it('rejects incorrect password or missing credentials', async () => {
    const nullResult = await authorize(null);
    expect(nullResult).toBeNull();

    const badPass = await authorize({
      email: 'alex@example.com',
      password: 'wrongpassword',
    });
    expect(badPass).toBeNull();
  });

  it('rejects unregistered users even if using password123 (backdoor prevention)', async () => {
    const user = await authorize({
      email: 'jordan@test.com',
      password: 'password123',
    });

    expect(user).toBeNull();
  });

  it('jwt and session callbacks transfer user properties', async () => {
    const jwtCallback = authOptions.callbacks?.jwt;
    const sessionCallback = authOptions.callbacks?.session;

    const mockUser: ExtendedUser = {
      id: 'user-1',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      role: 'Tester',
      bio: 'Bio text',
    };

    const token = await jwtCallback!({
      token: {},
      user: mockUser,
      account: null,
    });

    expect(token.id).toBe('user-1');
    expect(token.role).toBe('Tester');
    expect(token.bio).toBe('Bio text');

    const session = await sessionCallback!({
      session: {
        user: { name: 'Alex' },
        expires: '2099-01-01',
      },
      token,
      user: mockUser,
      newSession: false,
      trigger: 'update',
    });

    const userInSession = session.user as ExtendedUser;
    expect(userInSession.id).toBe('user-1');
    expect(userInSession.role).toBe('Tester');
    expect(userInSession.bio).toBe('Bio text');
  });

  it('registers new user and authorizes them successfully with custom credentials', async () => {
    const { registerMockUser } = await import('@/lib/auth');
    const newUser = registerMockUser({
      name: 'Elena Rostova',
      email: 'elena.new@example.com',
      password: 'custompassword',
      role: 'Robotics Engineer',
      bio: 'Building autonomous bipedal systems.',
    });

    expect(newUser.name).toBe('Elena Rostova');
    expect(newUser.email).toBe('elena.new@example.com');

    // Authorize with registered credentials
    const authed = await authorize({
      email: 'elena.new@example.com',
      password: 'custompassword',
    });

    expect(authed).not.toBeNull();
    expect(authed?.name).toBe('Elena Rostova');
    expect(authed?.role).toBe('Robotics Engineer');
    expect(authed?.bio).toBe('Building autonomous bipedal systems.');
  });
});
