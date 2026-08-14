import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const lowStock = await prisma.product.findMany({
      where: {
        storeId: user.storeId,
        stock: { lte: 5 },
      },
      include: { category: true },
      take: 20,
    });

    return NextResponse.json({ success: true, data: lowStock });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch low stock' },
      { status: 500 },
    );
  }
}
