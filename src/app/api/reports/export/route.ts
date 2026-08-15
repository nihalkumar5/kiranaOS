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
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV
    const headers = ['Order ID', 'Date', 'Time', 'Customer', 'Payment Mode', 'Subtotal', 'Discount', 'GST', 'Total Amount'];
    
    const rows = orders.map((ord) => {
      const date = ord.createdAt.toISOString().split('T')[0];
      const time = ord.createdAt.toISOString().split('T')[1].split('.')[0];
      const customer = ord.customer?.name || 'Walk-in';
      return [
        ord.id,
        date,
        time,
        `"${customer}"`,
        ord.paymentMode || 'CASH',
        ord.subtotal.toString(),
        ord.discount.toString(),
        ord.gstAmount.toString(),
        ord.totalAmount.toString(),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kirana_sales_${startDateStr}_to_${endDateStr}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to export CSV' },
      { status: 500 },
    );
  }
}
