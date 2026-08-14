import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today'; // today, week, month, year, all

    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0);
    }

    const orders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: startDate },
        status: 'COMPLETED',
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSales = orders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0);
    const totalGst = orders.reduce((sum, ord) => sum + Number(ord.gstAmount), 0);
    const totalDiscount = orders.reduce((sum, ord) => sum + Number(ord.discount), 0);
    const ordersCount = orders.length;

    // Payment mode breakdown
    const paymentBreakdown: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, MIXED: 0 };
    for (const order of orders) {
      const mode = order.paymentMode || 'CASH';
      paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + Number(order.totalAmount);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalGst,
        totalDiscount,
        ordersCount,
        paymentBreakdown,
        orders,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate report' },
      { status: 500 },
    );
  }
}
