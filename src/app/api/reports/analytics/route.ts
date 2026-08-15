import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || 'last7days'; // 'today', 'last7days', 'thisMonth'

    const now = new Date();
    
    let currentStart = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (timeframe === 'today') {
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setDate(now.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(prevStart);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (timeframe === 'last7days') {
      currentStart.setDate(now.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 7);
      prevStart.setHours(0, 0, 0, 0);
    } else if (timeframe === 'thisMonth') {
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(1);
      prevStart.setHours(0, 0, 0, 0);
    } else {
      // Default to 7 days if unknown
      currentStart.setDate(now.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 7);
      prevStart.setHours(0, 0, 0, 0);
    }

    const currentEnd = now;

    // 1. Fetch current period orders
    const currentOrders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: currentStart, lte: currentEnd },
        status: 'COMPLETED',
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // 2. Fetch previous period orders for trend
    const prevOrders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: prevStart, lte: prevEnd },
        status: 'COMPLETED',
      },
      select: { totalAmount: true },
    });

    const currentRevenue = currentOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const prevRevenue = prevOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    let trendPercent = 0;
    if (prevRevenue > 0) {
      trendPercent = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (currentRevenue > 0) {
      trendPercent = 100; // infinite growth from 0
    }

    // 3. Product Analysis (Top Sellers & Category Breakdown)
    const productSalesMap: Record<string, { product: any; quantity: number; revenue: number }> = {};
    const categorySalesMap: Record<string, number> = {};

    for (const order of currentOrders) {
      for (const item of order.items) {
        const pId = item.productId;
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            product: item.product,
            quantity: 0,
            revenue: 0,
          };
        }
        productSalesMap[pId].quantity += Number(item.quantity);
        productSalesMap[pId].revenue += Number(item.quantity) * Number(item.price);

        // Category Sales (assuming product has categoryId, if not, group as "Uncategorized")
        const catId = item.product.categoryId || 'Uncategorized';
        categorySalesMap[catId] = (categorySalesMap[catId] || 0) + (Number(item.quantity) * Number(item.price));
      }
    }

    const topSellersList = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // To get category names
    const categoryIds = Object.keys(categorySalesMap).filter(id => id !== 'Uncategorized');
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });
    
    const categoryBreakdown = Object.entries(categorySalesMap).map(([id, amount]) => {
      const cat = categories.find(c => c.id === id);
      return {
        name: cat ? cat.name : 'Uncategorized',
        amount,
      };
    }).sort((a, b) => b.amount - a.amount);

    // 4. Inventory Health (Restock & Slow Movers)
    const allProducts = await prisma.product.findMany({
      where: { storeId: user.storeId },
    });

    const slowMovers = [];
    const restockNeeded = [];

    for (const prod of allProducts) {
      const stock = Number(prod.stock);
      const salesData = productSalesMap[prod.id];
      const qtySold = salesData ? salesData.quantity : 0;

      // Slow mover: Stock is high (>20) but sold 0 or very little (<2) in the timeframe
      if (stock >= 20 && qtySold <= 2) {
        slowMovers.push({ product: prod, stock, qtySold });
      }

      // Restock: Sold decently (>5) but stock is low (<10)
      if (qtySold >= 5 && stock < 10) {
        restockNeeded.push({ product: prod, stock, qtySold });
      }
    }

    // Sort slow movers by highest stock first
    slowMovers.sort((a, b) => b.stock - a.stock);
    // Sort restock by highest sold first
    restockNeeded.sort((a, b) => b.qtySold - a.qtySold);

    return NextResponse.json({
      success: true,
      data: {
        timeframe,
        currentRevenue,
        prevRevenue,
        trendPercent,
        billsCount: currentOrders.length,
        topSellers: topSellersList,
        categoryBreakdown,
        slowMovers: slowMovers.slice(0, 15),
        restockNeeded: restockNeeded.slice(0, 15),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
