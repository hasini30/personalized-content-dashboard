import { NextRequest, NextResponse } from 'next/server';
import { registerMockUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email || !body.name || !body.password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = registerMockUser({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,
      bio: body.bio,
      avatar: body.avatar,
    });

    return NextResponse.json({ user, message: 'User registered successfully' });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
