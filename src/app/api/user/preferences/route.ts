import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPreferences, saveUserPreferences } from '@/lib/db/preferencesRepository';
import { getUserByEmail } from '@/lib/db/userRepository';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = session.user && 'id' in session.user ? (session.user.id as string) : null;
    if (!userId && session.user.email) {
      const u = getUserByEmail(session.user.email);
      if (u) userId = u.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent IDOR: if client specifies a userId that differs from session user, reject
    const requestedUserId = req.nextUrl.searchParams.get('userId');
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access another user preferences' },
        { status: 403 }
      );
    }

    const prefs = getUserPreferences(userId);
    return NextResponse.json({ preferences: prefs });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = session.user && 'id' in session.user ? (session.user.id as string) : null;
    if (!userId && session.user.email) {
      const u = getUserByEmail(session.user.email);
      if (u) userId = u.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Prevent IDOR: if client specifies a userId that differs from session user, reject
    if (body.userId && body.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify another user preferences' },
        { status: 403 }
      );
    }

    const saved = saveUserPreferences(userId, {
      categories: body.categories,
      movieGenres: body.movieGenres,
      autoRefreshInterval: body.autoRefreshInterval,
      feedScope: body.feedScope,
      contentLanguage: body.contentLanguage,
      streamEnabled: body.streamEnabled,
      language: body.language,
    });

    return NextResponse.json({ preferences: saved, message: 'Preferences saved to database' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
