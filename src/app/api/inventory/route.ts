import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await prisma.inventoryTransaction.findMany({
      where: { storeId: user.storeId },
      include: {
        product: { select: { name: true, barcode: true, unit: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const lowStock = await prisma.product.findMany({
      where: {
        storeId: user.storeId,
        stock: { lte: 5 },
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: { logs, lowStock },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch inventory' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { productId, quantity, purchasePrice, description } = body;

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { success: false, message: 'Product ID and quantity are required' },
        { status: 400 },
      );
    }

    const qty = parseFloat(quantity);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.storeId !== user.storeId) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const beforeStock = Number(product.stock);
    const afterStock = beforeStock + qty;

    const updateData: any = { stock: afterStock };
    if (purchasePrice !== undefined) {
      updateData.purchasePrice = parseFloat(purchasePrice);
    }

    await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    const log = await prisma.inventoryTransaction.create({
      data: {
        storeId: user.storeId,
        productId,
        userId: user.sub,
        type: 'PURCHASE',
        quantity: qty,
        beforeStock,
        afterStock,
        description: description || 'Stock replenishment / purchase',
      },
      include: {
        product: true,
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update inventory' },
      { status: 500 },
    );
  }
}
