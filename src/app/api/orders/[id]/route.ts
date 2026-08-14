import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await context.params;

    const order = await prisma.order.findFirst({
      where: { id, storeId: user.storeId },
      include: {
        customer: true,
        items: { include: { product: true } },
        store: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch order' },
      { status: 500 },
    );
  }
}
