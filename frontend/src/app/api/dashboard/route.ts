import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Today's orders
    const todayOrders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: todayStart, lte: todayEnd },
        status: 'COMPLETED',
      },
      include: {
        items: { include: { product: true } },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0);
    const todayBillsCount = todayOrders.length;

    // Total products & low stock
    const totalProducts = await prisma.product.count({ where: { storeId: user.storeId } });
    const lowStockProducts = await prisma.product.findMany({
      where: { storeId: user.storeId, stock: { lte: 5 } },
      take: 10,
    });

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      where: { storeId: user.storeId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Top selling items today
    const itemMap: Record<string, { name: string; qty: number; amount: number }> = {};
    for (const order of todayOrders) {
      for (const item of order.items) {
        const pName = item.product?.name || 'Unknown Item';
        if (!itemMap[pName]) {
          itemMap[pName] = { name: pName, qty: 0, amount: 0 };
        }
        itemMap[pName].qty += Number(item.quantity);
        itemMap[pName].amount += Number(item.price) * Number(item.quantity);
      }
    }

    const topSelling = Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        todayRevenue,
        todayBillsCount,
        totalProducts,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        recentOrders,
        topSelling,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 },
    );
  }
}
