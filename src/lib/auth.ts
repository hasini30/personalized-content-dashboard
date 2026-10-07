import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  bio: string;
}

export const MOCK_USERS: Record<string, MockUser & { password: string }> = {
  'alex@example.com': {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    password: 'password123',
    role: 'Senior Software Architect',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    bio: 'Passionate about distributed reactive systems, quantum computing, and sci-fi cinema.',
  },
  'priya@example.com': {
    id: 'user-2',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'password123',
    role: 'Quantitative Finance & Media Curator',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Tracking global macroeconomic shifts, renewable energy markets, and international film festivals.',
  },
};

import { createUser, getUserByEmail, DbUser } from './db/userRepository';
import { verifyPassword } from './security/password';

export function registerMockUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  bio?: string;
  avatar?: string;
}): MockUser {
  const emailKey = data.email.toLowerCase().trim();
  const password = data.password || 'password123';
  const role = data.role?.trim() || 'FeedPulse Member';
  const avatar =
    data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
  const bio = data.bio?.trim() || 'Active member exploring personalized content.';

  // Persist to SQLite
  let dbUser: DbUser | null = null;
  try {
    dbUser = getUserByEmail(emailKey);
    if (!dbUser) {
      dbUser = createUser({
        name: data.name,
        email: emailKey,
        password,
        role,
        avatar,
        bio,
      });
    }
  } catch (err) {
    console.warn('SQLite persistence error in registerMockUser:', err);
  }

  const newUser: MockUser & { password: string } = {
    id: dbUser?.id || `user-${Date.now()}`,
    name: dbUser?.name || data.name.trim(),
    email: emailKey,
    password,
    role: dbUser?.role || role,
    avatar: dbUser?.avatar || avatar,
    bio: dbUser?.bio || bio,
  };
  MOCK_USERS[emailKey] = newUser;
  return newUser;
}

export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  'feedpulse_secure_jwt_session_signing_secret_key_32chars_min_2026';

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const emailLower = credentials.email.toLowerCase().trim();
        const user = MOCK_USERS[emailLower];
        if (user) {
          if (verifyPassword(credentials.password, user.password)) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.avatar,
              role: user.role,
              bio: user.bio,
            };
          }
          return null;
        }

        // Check persistent SQLite database
        try {
          const dbUser = getUserByEmail(emailLower);
          if (dbUser && dbUser.password) {
            if (verifyPassword(credentials.password, dbUser.password)) {
              return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                image: dbUser.avatar,
                role: dbUser.role,
                bio: dbUser.bio,
              };
            }
            return null;
          }
        } catch (err) {
          console.warn('SQLite lookup error in authorize:', err);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as MockUser).role;
        token.bio = (user as unknown as MockUser).bio;
      }
      if (trigger === 'update' && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.role) token.role = session.user.role;
        if (session.user.bio) token.bio = session.user.bio;
        if (session.user.image) token.picture = session.user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error custom user properties
        session.user.id = token.id as string;
        // @ts-expect-error custom user properties
        session.user.role = token.role as string;
        // @ts-expect-error custom user properties
        session.user.bio = token.bio as string;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
};
