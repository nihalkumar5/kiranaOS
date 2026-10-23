import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Customer places an order or Store owner gets list of online orders
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const onlineOrders = await prisma.onlineOrder.findMany({
      where: { storeId: user.storeId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, unit: true, sellingPrice: true, brand: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: onlineOrders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch online orders' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, customerName, customerMobile, items, paymentMode = 'CASH_ON_PICKUP' } = body;

    if (!storeId || !customerMobile || !customerName || !items || !items.length) {
      return NextResponse.json(
        { success: false, message: 'Please provide store, customer and item details.' },
        { status: 400 },
      );
    }

    const order = await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.upsert({
          where: {
            mobile_storeId: {
              mobile: customerMobile.trim(),
              storeId,
            },
          },
          update: { name: customerName.trim() },
          create: {
            name: customerName.trim(),
            mobile: customerMobile.trim(),
            storeId,
          },
        });

        let subtotal = 0;
        const onlineItemsData: any[] = [];
        for (const item of items) {
          const price = parseFloat(item.price);
          const quantity = parseFloat(item.quantity);
          subtotal += price * quantity;
          onlineItemsData.push({
            productId: item.productId,
            quantity,
            price,
          });
        }

        const createdOnlineOrder = await tx.onlineOrder.create({
          data: {
            storeId,
            customerId: customer.id,
            subtotal,
            totalAmount: subtotal,
            paymentMode,
            status: 'PENDING',
            paymentStatus: 'PENDING',
          },
        });

        await tx.onlineOrderItem.createMany({
          data: onlineItemsData.map((d) => ({
            ...d,
            onlineOrderId: createdOnlineOrder.id,
          })),
        });

        return createdOnlineOrder;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );

    const fullOrder = await prisma.onlineOrder.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, data: fullOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to place online order' },
      { status: 500 },
    );
  }
}
