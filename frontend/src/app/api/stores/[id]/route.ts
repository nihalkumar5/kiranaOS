import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        categories: true,
        products: {
          where: { stock: { gt: 0 } },
          include: { category: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: store });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch public store catalog' },
      { status: 500 },
    );
  }
}
