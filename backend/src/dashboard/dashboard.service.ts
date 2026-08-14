import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(storeId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 1. Fetch Today's Orders (COMPLETED)
    const todayOrders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    let todaySales = 0;
    let billsCount = todayOrders.length;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;

    todayOrders.forEach((o) => {
      const amt = Number(o.totalAmount);
      todaySales += amt;
      if (o.paymentMode === 'CASH') cashSales += amt;
      else if (o.paymentMode === 'UPI') upiSales += amt;
      else cardSales += amt; // card or mixed
    });

    // 2. Best Selling Products (Aggregated in PostgreSQL)
    const bestSellersGrouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          storeId,
          status: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const bestSellers = await Promise.all(
      bestSellersGrouped.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, brand: true, unit: true, sellingPrice: true },
        });
        return {
          name: product?.name || 'Unknown Product',
          brand: product?.brand || 'Local',
          unit: product?.unit || 'pcs',
          price: product?.sellingPrice || 0,
          quantitySold: Number(item._sum.quantity || 0),
        };
      })
    );

    // 3. Category Sales Distribution
    // Find all items sold in the store's history
    const allCompletedItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          storeId,
          status: 'COMPLETED',
        },
      },
      include: {
        product: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
      },
    });

    const categoryMap: Record<string, number> = {};
    allCompletedItems.forEach((item) => {
      const categoryName = item.product?.category?.name || 'Uncategorized';
      const itemTotal = Number(item.price) * Number(item.quantity);
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + itemTotal;
    });

    const categorySales = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // 4. Low Stock Alerts
    const lowStockCount = await this.prisma.product.count({
      where: {
        storeId,
        stock: {
          lt: 15.0,
        },
      },
    });

    const lowStockList = await this.prisma.product.findMany({
      where: {
        storeId,
        stock: {
          lt: 15.0,
        },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        unit: true,
      },
      orderBy: { stock: 'asc' },
      take: 5,
    });

    return {
      todaySales,
      billsCount,
      cashSales,
      upiSales,
      cardSales,
      bestSellers,
      categorySales,
      lowStock: {
        count: lowStockCount,
        items: lowStockList,
      },
    };
  }
}
