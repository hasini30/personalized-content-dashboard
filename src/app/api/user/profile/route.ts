import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById, getUserByEmail, updateUser } from '@/lib/db/userRepository';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user && 'id' in session.user ? (session.user.id as string) : null;
    const userEmail = session.user.email;

    let user = null;
    if (userId) {
      user = getUserById(userId);
    }
    if (!user && userEmail) {
      user = getUserByEmail(userEmail);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password: _p, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user && 'id' in session.user ? (session.user.id as string) : null;
    const userEmail = session.user.email;

    let targetId = userId;
    if (!targetId && userEmail) {
      const found = getUserByEmail(userEmail);
      if (found) targetId = found.id;
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Prevent IDOR: reject attempts to modify another user's profile
    if (body.userId && body.userId !== targetId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify another user profile' },
        { status: 403 }
      );
    }

    const updated = updateUser(targetId, {
      name: body.name,
      role: body.role,
      avatar: body.avatar,
      bio: body.bio,
    });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password: _p, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser, message: 'Profile updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
