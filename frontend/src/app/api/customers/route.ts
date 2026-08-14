import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get('mobile') || searchParams.get('q');

    if (mobile) {
      const customers = await prisma.customer.findMany({
        where: {
          storeId: user.storeId,
          mobile: { contains: mobile.trim() },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json({ success: true, data: customers });
    }

    const customers = await prisma.customer.findMany({
      where: { storeId: user.storeId },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: customers });
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
