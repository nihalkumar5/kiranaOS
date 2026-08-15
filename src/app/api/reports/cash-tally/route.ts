import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const tallies = await prisma.cashTally.findMany({
      where: { storeId: user.storeId },
      orderBy: { tallyDate: 'desc' },
      take: 50, // Get last 50 tallies
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: tallies });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch cash tallies' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { actualAmount, notes } = body;

    if (actualAmount === undefined) {
      return NextResponse.json(
        { success: false, message: 'actualAmount is required' },
        { status: 400 },
      );
    }

    // Calculate expected amount (today's cash sales)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: today },
        status: 'COMPLETED',
        paymentMode: 'CASH',
      },
    });

    const expectedAmount = orders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0);
    const difference = Number(actualAmount) - expectedAmount;

    const newTally = await prisma.cashTally.create({
      data: {
        storeId: user.storeId,
        userId: user.sub,
        tallyDate: new Date(),
        expectedAmount,
        actualAmount: Number(actualAmount),
        difference,
        notes,
      },
    });

    return NextResponse.json({ success: true, data: newTally });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create cash tally' },
      { status: 500 },
    );
  }
}
