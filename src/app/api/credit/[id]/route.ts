import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, storeId: user.storeId },
      include: {
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: { billNumber: true, totalAmount: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { name: true, upiId: true, phone: true },
    });

    let totalGave = 0;
    let totalGot = 0;

    const ledger = customer.creditTransactions.map((t) => {
      const amt = Number(t.amount);
      if (t.type === 'GIVE_CREDIT') totalGave += amt;
      else if (t.type === 'PAYMENT_RECEIVED') totalGot += amt;

      return {
        id: t.id,
        type: t.type,
        amount: amt,
        description: t.description,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        order: t.order,
      };
    });

    const balance = Math.round((totalGave - totalGot) * 100) / 100;
    const cleanMobile = customer.mobile.replace(/\D/g, '').slice(-10);
    const reminderMsg = `🙏 Namaste ${customer.name} ji!\n\n${store?.name || 'Kirana Store'} se aapka kul baaki hisaab ₹${balance} hai.\nKripya samay par bhugtan karein.\n${store?.upiId ? `📲 UPI ID: ${store.upiId}\n` : ''}\nDhanyawad! 🙏`;
    const whatsappUrl = cleanMobile
      ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(reminderMsg)}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          creditLimit: Number(customer.creditLimit),
          totalGave,
          totalGot,
          balance,
          whatsappUrl,
          reminderMsg,
        },
        transactions: ledger,
        store,
      },
    });
  } catch (error: any) {
    console.error('Customer credit ledger error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch customer ledger' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { success: false, message: 'transactionId query param is required' },
        { status: 400 }
      );
    }

    const txRecord = await prisma.creditTransaction.findFirst({
      where: { id: transactionId, storeId: user.storeId, customerId: id },
    });

    if (!txRecord) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }

    await prisma.creditTransaction.delete({
      where: { id: transactionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete credit transaction error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
