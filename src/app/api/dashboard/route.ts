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
        items: { include: { product: { include: { category: true } } } },
      },
    });

    let todaySales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    const billsCount = todayOrders.length;

    const itemMap: Record<string, { name: string; brand: string; unit: string; price: number; quantitySold: number }> = {};
    const categoryMap: Record<string, number> = {};

    for (const order of todayOrders) {
      const amount = Number(order.totalAmount);
      todaySales += amount;
      if (order.paymentMode === 'CASH') cashSales += amount;
      else if (order.paymentMode === 'UPI') upiSales += amount;
      else cardSales += amount;

      for (const item of order.items) {
        const pName = item.product?.name || 'Unknown Item';
        const brand = item.product?.brand || '';
        const unit = item.product?.unit || 'pcs';
        const price = Number(item.price);
        const qty = Number(item.quantity);

        if (!itemMap[pName]) {
          itemMap[pName] = { name: pName, brand, unit, price, quantitySold: 0 };
        }
        itemMap[pName].quantitySold += qty;

        const catName = item.product?.category?.name || 'General';
        categoryMap[catName] = (categoryMap[catName] || 0) + (price * qty);
      }
    }

    const bestSellers = Object.values(itemMap)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    const categorySales = Object.keys(categoryMap)
      .map(name => ({ name, value: categoryMap[name] }))
      .sort((a, b) => b.value - a.value);

    // Low stock
    const lowStockProducts = await prisma.product.findMany({
      where: { storeId: user.storeId, stock: { lte: 5 } },
      take: 10,
      select: { id: true, name: true, stock: true, unit: true }
    });
    
    const lowStockCount = await prisma.product.count({
      where: { storeId: user.storeId, stock: { lte: 5 } }
    });

    return NextResponse.json({
      success: true,
      data: {
        todaySales,
        billsCount,
        cashSales,
        upiSales,
        cardSales,
        bestSellers,
        categorySales,
        lowStock: {
          count: lowStockCount,
          items: lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            stock: String(p.stock),
            unit: p.unit || 'pcs'
          }))
        }
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 },
    );
  }
}
