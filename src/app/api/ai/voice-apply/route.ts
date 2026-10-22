import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { productId, field, newValue, updates } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID zaroori hai.' },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.storeId !== user.storeId) {
      return NextResponse.json(
        { success: false, message: 'Product nahi mila.' },
        { status: 404 },
      );
    }

    const beforeStock = parseFloat(product.stock.toString());
    const updateData: any = {};
    const appliedChanges: string[] = [];

    // Support multiple field updates
    if (updates && typeof updates === 'object') {
      if (updates.sellingPrice !== undefined && !isNaN(parseFloat(updates.sellingPrice))) {
        const val = parseFloat(updates.sellingPrice);
        updateData.sellingPrice = val;
        appliedChanges.push(`विक्रय दर ₹${val}`);
      }
      if (updates.purchasePrice !== undefined && !isNaN(parseFloat(updates.purchasePrice))) {
        const val = parseFloat(updates.purchasePrice);
        updateData.purchasePrice = val;
        appliedChanges.push(`खरीद मूल्य ₹${val}`);
      }
      if (updates.stock !== undefined && !isNaN(parseFloat(updates.stock))) {
        const val = parseFloat(updates.stock);
        updateData.stock = val;
        appliedChanges.push(`स्टॉक ${val} ${product.unit}`);
      }
    } else if (field && newValue !== undefined && !isNaN(parseFloat(newValue))) {
      // Legacy single field format
      const val = parseFloat(newValue);
      if (field === 'sellingPrice') {
        updateData.sellingPrice = val;
        appliedChanges.push(`विक्रय दर ₹${val}`);
      } else if (field === 'purchasePrice') {
        updateData.purchasePrice = val;
        appliedChanges.push(`खरीद मूल्य ₹${val}`);
      } else if (field === 'stock') {
        updateData.stock = val;
        appliedChanges.push(`स्टॉक ${val} ${product.unit}`);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Koi valid field update ke liye nahi mila.' },
        { status: 400 },
      );
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { category: true },
    });

    // If stock changed, record transaction in inventory audit
    if (updateData.stock !== undefined && updateData.stock !== beforeStock) {
      const diff = updateData.stock - beforeStock;
      await prisma.inventoryTransaction.create({
        data: {
          storeId: user.storeId,
          productId: product.id,
          userId: user.sub,
          type: 'AUDIT_ADJUSTMENT',
          quantity: Math.abs(diff),
          beforeStock,
          afterStock: updateData.stock,
          description: `Voice/Chat AI: Stock changed from ${beforeStock} to ${updateData.stock}`,
        },
      });
    }

    const speechParts: string[] = [];
    if (updateData.purchasePrice !== undefined) speechParts.push(`khareed daam ₹${updateData.purchasePrice}`);
    if (updateData.sellingPrice !== undefined) speechParts.push(`rate ₹${updateData.sellingPrice}`);
    if (updateData.stock !== undefined) speechParts.push(`stock ${updateData.stock} ${updated.unit}`);

    const speechText = `${updated.name} ka ${speechParts.join(' aur ')} update ho gaya`;

    return NextResponse.json({
      success: true,
      message: `${updated.name} safaltapoorvak update ho gaya! (${appliedChanges.join(', ')})`,
      speechText,
      data: {
        id: updated.id,
        name: updated.name,
        sellingPrice: parseFloat(updated.sellingPrice.toString()),
        purchasePrice: parseFloat(updated.purchasePrice.toString()),
        stock: parseFloat(updated.stock.toString()),
        unit: updated.unit,
        category: updated.category?.name || 'General',
      },
    });
  } catch (error: any) {
    console.error('Voice apply error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Product update failed' },
      { status: 500 },
    );
  }
}
