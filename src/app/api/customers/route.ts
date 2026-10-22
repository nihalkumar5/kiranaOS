import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get('mobile') || searchParams.get('q');

    const customers = await prisma.customer.findMany({
      where: {
        storeId: user.storeId,
        ...(mobile ? { mobile: { contains: mobile.trim() } } : {}),
      },
      include: {
        creditTransactions: {
          select: { type: true, amount: true },
        },
      },
      take: 25,
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = customers.map((c) => {
      let bal = 0;
      c.creditTransactions?.forEach((t) => {
        if (t.type === 'GIVE_CREDIT') bal += Number(t.amount);
        else if (t.type === 'PAYMENT_RECEIVED') bal -= Number(t.amount);
      });
      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        creditLimit: Number(c.creditLimit),
        creditBalance: Math.round(bal * 100) / 100,
        storeId: c.storeId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch customers' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { name, mobile } = body;

    if (!mobile || !name) {
      return NextResponse.json(
        { success: false, message: 'Name and mobile number are required' },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.upsert({
      where: {
        mobile_storeId: {
          mobile: mobile.trim(),
          storeId: user.storeId,
        },
      },
      update: { name: name.trim() },
      create: {
        name: name.trim(),
        mobile: mobile.trim(),
        storeId: user.storeId,
      },
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to save customer' },
      { status: 500 },
    );
  }
}
