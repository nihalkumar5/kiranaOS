import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { items, description } = body;

    if (!items || !items.length) {
      return NextResponse.json(
        { success: false, message: 'No items provided for purchase' },
        { status: 400 },
      );
    }

    const logs = await prisma.$transaction(async (tx) => {
      const createdLogs = [];
      for (const item of items) {
        const qty = parseFloat(item.quantity);
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product && product.storeId === user.storeId) {
          const beforeStock = Number(product.stock);
          const afterStock = beforeStock + qty;

          const updateData: any = { stock: afterStock };
          if (item.purchasePrice !== undefined && item.purchasePrice !== null) {
            updateData.purchasePrice = parseFloat(item.purchasePrice);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: updateData,
          });

          const log = await tx.inventoryTransaction.create({
            data: {
              storeId: user.storeId,
              productId: item.productId,
              userId: user.sub,
              type: 'PURCHASE',
              quantity: qty,
              beforeStock,
              afterStock,
              description: description || 'Purchase restock',
            },
          });
          createdLogs.push(log);
        }
      }
      return createdLogs;
    });

    return NextResponse.json({ success: true, data: logs }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Purchase restock failed' },
      { status: 500 },
    );
  }
}
