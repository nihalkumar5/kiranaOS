import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = getAuthUser(req);
    if (!payload) return unauthorizedResponse();

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { store: true },
    });

    if (!user) return unauthorizedResponse('User not found');

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
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Auth check failed' },
      { status: 500 },
    );
  }
}
