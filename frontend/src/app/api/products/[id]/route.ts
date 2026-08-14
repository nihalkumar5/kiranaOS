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

    const product = await prisma.product.findFirst({
      where: { id, storeId: user.storeId },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch product' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await context.params;
    const body = await req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.barcode !== undefined) updateData.barcode = body.barcode?.trim() || null;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = parseFloat(body.purchasePrice);
    if (body.sellingPrice !== undefined) updateData.sellingPrice = parseFloat(body.sellingPrice);
    if (body.stock !== undefined) updateData.stock = parseFloat(body.stock);
    if (body.unit !== undefined) updateData.unit = body.unit.trim();
    if (body.brand !== undefined) updateData.brand = body.brand?.trim() || null;
    if (body.gst !== undefined) updateData.gst = parseFloat(body.gst);

    const product = await prisma.product.updateMany({
      where: { id, storeId: user.storeId },
      data: updateData,
    });

    if (product.count === 0) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update product' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await context.params;

    await prisma.product.deleteMany({
      where: { id, storeId: user.storeId },
    });

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete product' },
      { status: 500 },
    );
  }
}
