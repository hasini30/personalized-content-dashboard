import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  clearFavorites,
} from '@/lib/db/favoritesRepository';
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

    // Prevent IDOR
    const requestedUserId = req.nextUrl.searchParams.get('userId');
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access another user favorites' },
        { status: 403 }
      );
    }

    const items = getUserFavorites(userId);
    return NextResponse.json({ favorites: items, total: items.length });
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
    if (body.userId && body.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify another user favorites' },
        { status: 403 }
      );
    }

    if (!body.item || !body.item.id) {
      return NextResponse.json({ error: 'Missing item' }, { status: 400 });
    }

    addFavorite(userId, body.item);
    return NextResponse.json({ message: 'Favorite saved to database', id: body.item.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const requestedUserId = req.nextUrl.searchParams.get('userId') || body.userId;
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify another user favorites' },
        { status: 403 }
      );
    }

    const itemId = req.nextUrl.searchParams.get('itemId') || body.itemId;
    const clearAll = req.nextUrl.searchParams.get('clearAll') === 'true' || body.clearAll;

    if (clearAll) {
      clearFavorites(userId);
      return NextResponse.json({ message: 'All favorites cleared from database' });
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    removeFavorite(userId, itemId);
    return NextResponse.json({ message: 'Favorite removed from database', itemId });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
