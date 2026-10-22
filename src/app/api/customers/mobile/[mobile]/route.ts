import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mobile: string }> }
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { mobile } = await params;
    const cleanMobile = mobile.trim();

    const customer = await prisma.customer.findFirst({
      where: {
        storeId: user.storeId,
        mobile: cleanMobile,
      },
      include: {
        creditTransactions: {
          select: { type: true, amount: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    let creditBalance = 0;
    customer.creditTransactions?.forEach((t) => {
      if (t.type === 'GIVE_CREDIT') creditBalance += Number(t.amount);
      else if (t.type === 'PAYMENT_RECEIVED') creditBalance -= Number(t.amount);
    });
    creditBalance = Math.round(creditBalance * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        creditLimit: Number(customer.creditLimit),
        creditBalance,
        storeId: customer.storeId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error looking up customer' },
      { status: 500 }
    );
  }
}
