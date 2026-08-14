import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const orders = await prisma.order.findMany({
      where: { storeId: user.storeId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    const total = await prisma.order.count({ where: { storeId: user.storeId } });

    return NextResponse.json({
      success: true,
      data: { orders, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const {
      items,
      customerId,
      customerName,
      customerMobile,
      subtotal,
      discount = 0,
      gstAmount = 0,
      totalAmount,
      paymentMode = 'CASH',
    } = body;

    if (!items || !items.length || totalAmount === undefined) {
      return NextResponse.json(
        { success: false, message: 'Order must contain at least one item and total amount.' },
        { status: 400 },
      );
    }

    const orderResult = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create customer if provided
      let finalCustomerId = customerId || null;
      if (!finalCustomerId && customerMobile && customerMobile.trim()) {
        const cust = await tx.customer.upsert({
          where: {
            mobile_storeId: {
              mobile: customerMobile.trim(),
              storeId: user.storeId,
            },
          },
          update: customerName ? { name: customerName.trim() } : {},
          create: {
            name: customerName?.trim() || 'Valued Customer',
            mobile: customerMobile.trim(),
            storeId: user.storeId,
          },
        });
        finalCustomerId = cust.id;
      }

      // 2. Generate sequential Bill Number e.g. KOS-1001
      const count = await tx.order.count({ where: { storeId: user.storeId } });
      const billNumber = `KOS-${1001 + count}`;

      // 3. Create the Order
      const createdOrder = await tx.order.create({
        data: {
          billNumber,
          storeId: user.storeId,
          userId: user.sub,
          customerId: finalCustomerId,
          subtotal: parseFloat(subtotal || totalAmount),
          discount: parseFloat(discount || '0'),
          gstAmount: parseFloat(gstAmount || '0'),
          totalAmount: parseFloat(totalAmount),
          paymentMode,
          status: 'COMPLETED',
        },
      });

      // 4. Create OrderItems and adjust product stock
      for (const item of items) {
        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.price);
        const gstRate = parseFloat(item.gstRate || '0');
        const itemGst = parseFloat(item.gstAmount || '0');

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            quantity: qty,
            price,
            gstRate,
            gstAmount: itemGst,
          },
        });

        // Decrement product stock & record inventory log
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (currentProduct) {
          const beforeStock = Number(currentProduct.stock);
          const afterStock = beforeStock - qty;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: afterStock },
          });

          await tx.inventoryTransaction.create({
            data: {
              storeId: user.storeId,
              productId: item.productId,
              userId: user.sub,
              type: 'SALE',
              quantity: -qty,
              beforeStock,
              afterStock,
              description: `POS Sale #${billNumber}`,
            },
          });
        }
      }

      return createdOrder;
    });

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderResult.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        store: true,
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: fullOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create order' },
      { status: 500 },
    );
  }
}
