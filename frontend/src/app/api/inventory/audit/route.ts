import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { productId, actualStock, reason } = body;

    if (!productId || actualStock === undefined) {
      return NextResponse.json(
        { success: false, message: 'Product ID and actual stock count are required' },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.storeId !== user.storeId) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const beforeStock = Number(product.stock);
    const newStock = parseFloat(actualStock);
    const difference = newStock - beforeStock;

    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    const log = await prisma.inventoryTransaction.create({
      data: {
        storeId: user.storeId,
        productId,
        userId: user.sub,
        type: 'AUDIT_ADJUSTMENT',
        quantity: difference,
        beforeStock,
        afterStock: newStock,
        description: reason || 'Physical inventory audit adjustment',
      },
      include: {
        product: true,
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Audit adjustment failed' },
      { status: 500 },
    );
  }
}
