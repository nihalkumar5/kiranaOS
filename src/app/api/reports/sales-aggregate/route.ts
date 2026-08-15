import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalSales = orders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0);
    const totalTax = orders.reduce((sum, ord) => sum + Number(ord.gstAmount), 0);
    const totalDiscount = orders.reduce((sum, ord) => sum + Number(ord.discount), 0);
    const billsCount = orders.length;

    const paymentMap: Record<string, number> = {};
    const timelineMap: Record<string, { sales: number; bills: number }> = {};

    for (const order of orders) {
      const mode = order.paymentMode || 'CASH';
      paymentMap[mode] = (paymentMap[mode] || 0) + Number(order.totalAmount);

      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = { sales: 0, bills: 0 };
      }
      timelineMap[dateStr].sales += Number(order.totalAmount);
      timelineMap[dateStr].bills += 1;
    }

    const paymentSplit = Object.entries(paymentMap).map(([mode, value]) => ({ mode, value }));
    const salesTimeline = Object.entries(timelineMap).map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalTax,
        totalDiscount,
        billsCount,
        paymentSplit,
        salesTimeline,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate aggregate' },
      { status: 500 },
    );
  }
}
