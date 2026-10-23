import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';
import { OnlineOrderStatus } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (!status || !Object.values(OnlineOrderStatus).includes(status as OnlineOrderStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status. Valid values: ${Object.values(OnlineOrderStatus).join(', ')}`,
        },
        { status: 400 },
      );
    }

    const order = await prisma.onlineOrder.findFirst({
      where: { id, storeId: user.storeId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Online order not found' },
        { status: 404 },
      );
    }

    const prevStatus = order.status;
    const targetStatus = status as OnlineOrderStatus;

    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        // 1. If transitioning to APPROVED from PENDING, deduct inventory stock
        if (targetStatus === 'APPROVED' && prevStatus === 'PENDING') {
          const productIds = order.items.map((i) => i.productId);
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, stock: true },
          });
          const productStockMap = new Map(products.map((p) => [p.id, Number(p.stock)]));

          const inventoryLogs: any[] = [];
          const stockUpdates: Promise<any>[] = [];

          for (const item of order.items) {
            const qty = Number(item.quantity);
            if (productStockMap.has(item.productId)) {
              const beforeStock = productStockMap.get(item.productId)!;
              const afterStock = beforeStock - qty;

              inventoryLogs.push({
                storeId: user.storeId,
                productId: item.productId,
                userId: user.sub,
                type: 'SALE',
                quantity: -qty,
                beforeStock,
                afterStock,
                description: `Online Order #${order.id.slice(0, 8)} Approved`,
              });

              stockUpdates.push(
                tx.product.update({
                  where: { id: item.productId },
                  data: { stock: afterStock },
                }),
              );
            }
          }

          if (inventoryLogs.length > 0) {
            await tx.inventoryTransaction.createMany({ data: inventoryLogs });
          }
          if (stockUpdates.length > 0) {
            await Promise.all(stockUpdates);
          }
        }

        // 2. If transitioning to CANCELLED from APPROVED / READY, restore inventory stock
        if (
          targetStatus === 'CANCELLED' &&
          (prevStatus === 'APPROVED' || prevStatus === 'READY')
        ) {
          const productIds = order.items.map((i) => i.productId);
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, stock: true },
          });
          const productStockMap = new Map(products.map((p) => [p.id, Number(p.stock)]));

          const inventoryLogs: any[] = [];
          const stockUpdates: Promise<any>[] = [];

          for (const item of order.items) {
            const qty = Number(item.quantity);
            if (productStockMap.has(item.productId)) {
              const beforeStock = productStockMap.get(item.productId)!;
              const afterStock = beforeStock + qty;

              inventoryLogs.push({
                storeId: user.storeId,
                productId: item.productId,
                userId: user.sub,
                type: 'RETURN',
                quantity: qty,
                beforeStock,
                afterStock,
                description: `Online Order #${order.id.slice(0, 8)} Cancelled (Restock)`,
              });

              stockUpdates.push(
                tx.product.update({
                  where: { id: item.productId },
                  data: { stock: afterStock },
                }),
              );
            }
          }

          if (inventoryLogs.length > 0) {
            await tx.inventoryTransaction.createMany({ data: inventoryLogs });
          }
          if (stockUpdates.length > 0) {
            await Promise.all(stockUpdates);
          }
        }

        // 3. Update order status
        return tx.onlineOrder.update({
          where: { id },
          data: {
            status: targetStatus,
            ...(targetStatus === 'PICKED_UP' ? { paymentStatus: 'PAID' } : {}),
          },
          include: {
            customer: true,
            items: {
              include: { product: true },
            },
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );

    invalidateCache(`products:${user.storeId}`);

    return NextResponse.json({
      success: true,
      message: `Online order status updated to ${targetStatus}`,
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error('Update online order status error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update order status' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(req, context);
}
