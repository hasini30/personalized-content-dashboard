import { withAuth } from 'next-auth/middleware';

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  'feedpulse_secure_jwt_session_signing_secret_key_32chars_min_2026';

export default withAuth({
  secret: AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/profile'],
};
