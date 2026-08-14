import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashTallyDto } from './dto/create-cash-tally.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesAggregate(storeId: string, startDateStr?: string, endDateStr?: string) {
    const { startDate, endDate } = this.resolveDates(startDateStr, endDateStr);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 1. Calculate overall aggregates
    let totalSales = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;

    orders.forEach((o) => {
      const amt = Number(o.totalAmount);
      totalSales += amt;
      totalTax += Number(o.gstAmount);
      totalDiscount += Number(o.discount);

      if (o.paymentMode === 'CASH') cashSales += amt;
      else if (o.paymentMode === 'UPI') upiSales += amt;
      else cardSales += amt;
    });

    // 2. Timeline grouping (Daily)
    const dailyMap: Record<string, { date: string; sales: number; bills: number }> = {};
    orders.forEach((o) => {
      const dateKey = o.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, sales: 0, bills: 0 };
      }
      dailyMap[dateKey].sales += Number(o.totalAmount);
      dailyMap[dateKey].bills += 1;
    });

    const salesTimeline = Object.values(dailyMap);

    return {
      totalSales,
      totalTax,
      totalDiscount,
      billsCount: orders.length,
      paymentSplit: [
        { mode: 'CASH', value: cashSales },
        { mode: 'UPI', value: upiSales },
        { mode: 'CARD', value: cardSales },
      ],
      salesTimeline,
    };
  }

  async exportSalesCsv(storeId: string, startDateStr?: string, endDateStr?: string): Promise<string> {
    const { startDate, endDate } = this.resolveDates(startDateStr, endDateStr);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let csvContent = 'Bill Number,Date,Cashier,Customer Name,Customer Mobile,Payment Mode,Subtotal,Discount,GST Amount,Total Amount\n';

    orders.forEach((o) => {
      const billNo = o.billNumber;
      const date = o.createdAt.toISOString().split('T')[0];
      const cashier = o.user?.name || 'Unknown';
      const custName = o.customer?.name || 'Walk-in';
      const custMobile = o.customer?.mobile || 'N/A';
      const mode = o.paymentMode;
      const subtotal = Number(o.subtotal).toFixed(2);
      const discount = Number(o.discount).toFixed(2);
      const gst = Number(o.gstAmount).toFixed(2);
      const total = Number(o.totalAmount).toFixed(2);

      // Clean customer names from commas to keep CSV formatted
      const safeCustName = custName.replace(/,/g, ' ');

      csvContent += `"${billNo}","${date}","${cashier}","${safeCustName}","${custMobile}","${mode}",${subtotal},${discount},${gst},${total}\n`;
    });

    return csvContent;
  }

  async createCashTally(storeId: string, userId: string, dto: CreateCashTallyDto) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 1. Calculate Expected Cash Sales for the current calendar day
    const todayCashOrders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
        paymentMode: 'CASH',
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    let expectedAmount = 0;
    todayCashOrders.forEach((o) => {
      expectedAmount += Number(o.totalAmount);
    });

    const difference = dto.actualAmount - expectedAmount;

    // 2. Log Cash Tally entry
    return this.prisma.cashTally.create({
      data: {
        storeId,
        userId,
        expectedAmount,
        actualAmount: dto.actualAmount,
        difference,
        notes: dto.notes || '',
      },
      include: {
        user: { select: { name: true } },
      },
    });
  }

  async getCashTallies(storeId: string) {
    return this.prisma.cashTally.findMany({
      where: { storeId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private resolveDates(startDateStr?: string, endDateStr?: string) {
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date(); // Default to now

    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }
}
