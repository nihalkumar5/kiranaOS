import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body || {};

    let user = null;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: { store: true },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        include: { store: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No user account found in database.' },
        { status: 404 },
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
