import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide both email and password.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { store: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 },
      );
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        store: user.store,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Login failed' },
      { status: 500 },
    );
  }
}
