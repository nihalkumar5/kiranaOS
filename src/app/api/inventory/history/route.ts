import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const logs = await prisma.inventoryTransaction.findMany({
      where: { storeId: user.storeId },
      include: {
        product: { select: { name: true, barcode: true, unit: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch inventory history' },
      { status: 500 },
    );
  }
}
