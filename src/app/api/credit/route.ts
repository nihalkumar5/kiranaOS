import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const filter = searchParams.get('filter') || 'dues'; // dues | all | overdue

    // Fetch store info for UPI/name
    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { name: true, upiId: true, phone: true },
    });

    // Fetch customers with credit transactions
    const customers = await prisma.customer.findMany({
      where: {
        storeId: user.storeId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalMarketDue = 0;
    let collectedToday = 0;
    let customersWithDueCount = 0;

    const customersWithBalance = customers.map((c) => {
      let totalGave = 0; // Udhaar
      let totalGot = 0;  // Jama
      let hasOverdue = false;

      c.creditTransactions.forEach((t) => {
        const amt = Number(t.amount);
        if (t.type === 'GIVE_CREDIT') {
          totalGave += amt;
          if (t.dueDate && new Date(t.dueDate) < now) {
            hasOverdue = true;
          }
        } else if (t.type === 'PAYMENT_RECEIVED') {
          totalGot += amt;
          if (new Date(t.createdAt) >= startOfToday) {
            collectedToday += amt;
          }
        }
      });

      const balance = Math.round((totalGave - totalGot) * 100) / 100;
      if (balance > 0) {
        totalMarketDue += balance;
        customersWithDueCount++;
      }

      // Generate pre-filled WhatsApp reminder
      const cleanMobile = c.mobile.replace(/\D/g, '').slice(-10);
      const reminderMsg = `🙏 Namaste ${c.name} ji!\n\n${store?.name || 'Kirana Store'} se aapka kul baaki hisaab ₹${balance} hai.\nKripya samay par bhugtan karein.\n${store?.upiId ? `📲 UPI ID: ${store.upiId}\n` : ''}\nDhanyawad! 🙏`;
      const whatsappUrl = cleanMobile
        ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(reminderMsg)}`
        : null;

      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        creditLimit: Number(c.creditLimit),
        totalGave,
        totalGot,
        balance,
        hasOverdue: hasOverdue && balance > 0,
        lastTransaction: c.creditTransactions[0] || null,
        transactionCount: c.creditTransactions.length,
        whatsappUrl,
        reminderMsg,
      };
    });

    // Filter
    let filtered = customersWithBalance;
    if (filter === 'dues') {
      filtered = customersWithBalance.filter((c) => c.balance > 0);
    } else if (filter === 'overdue') {
      filtered = customersWithBalance.filter((c) => c.hasOverdue);
    }

    // Sort: highest balance first
    filtered.sort((a, b) => b.balance - a.balance);

    return NextResponse.json({
      success: true,
      data: {
        customers: filtered,
        summary: {
          totalMarketDue: Math.round(totalMarketDue * 100) / 100,
          collectedToday: Math.round(collectedToday * 100) / 100,
          customersWithDueCount,
          totalCustomers: customers.length,
        },
        store,
      },
    });
  } catch (error: any) {
    console.error('Credit GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch credit data' },
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
      customerId,
      customerName,
      customerMobile,
      type, // 'GIVE_CREDIT' | 'PAYMENT_RECEIVED'
      amount,
      description,
      dueDate,
    } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 },
      );
    }

    if (!type || !['GIVE_CREDIT', 'PAYMENT_RECEIVED'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid transaction type (GIVE_CREDIT or PAYMENT_RECEIVED required)' },
        { status: 400 },
      );
    }

    // Resolve customer
    let targetCustomerId = customerId;
    let customerObj: any = null;

    if (targetCustomerId) {
      customerObj = await prisma.customer.findFirst({
        where: { id: targetCustomerId, storeId: user.storeId },
      });
    }

    if (!customerObj) {
      if (!customerMobile || !customerMobile.trim()) {
        return NextResponse.json(
          { success: false, message: 'Customer phone number is required' },
          { status: 400 },
        );
      }

      customerObj = await prisma.customer.upsert({
        where: {
          mobile_storeId: {
            mobile: customerMobile.trim(),
            storeId: user.storeId,
          },
        },
        update: customerName ? { name: customerName.trim() } : {},
        create: {
          name: customerName?.trim() || 'Grahak',
          mobile: customerMobile.trim(),
          storeId: user.storeId,
        },
      });
      targetCustomerId = customerObj.id;
    }

    // Create Credit Transaction
    const transaction = await prisma.creditTransaction.create({
      data: {
        storeId: user.storeId,
        customerId: targetCustomerId,
        type,
        amount: parsedAmount,
        description: description?.trim() || (type === 'GIVE_CREDIT' ? 'Udhaar Diya' : 'Jama Mila'),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Touch customer updated at
    await prisma.customer.update({
      where: { id: targetCustomerId },
      data: { updatedAt: new Date() },
    });

    // Calculate new total balance
    const allTx = await prisma.creditTransaction.findMany({
      where: { customerId: targetCustomerId, storeId: user.storeId },
    });

    let newBalance = 0;
    allTx.forEach((t) => {
      const amt = Number(t.amount);
      if (t.type === 'GIVE_CREDIT') newBalance += amt;
      else if (t.type === 'PAYMENT_RECEIVED') newBalance -= amt;
    });
    newBalance = Math.round(newBalance * 100) / 100;

    // Fetch store for WhatsApp reminder
    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { name: true, upiId: true },
    });

    const cleanMobile = customerObj.mobile.replace(/\D/g, '').slice(-10);
    const reminderMsg = `🙏 Namaste ${customerObj.name} ji!\n\n${store?.name || 'Kirana Store'} se aapka kul baaki hisaab ₹${newBalance} hai.\nKripya samay par bhugtan karein.\n${store?.upiId ? `📲 UPI ID: ${store.upiId}\n` : ''}\nDhanyawad! 🙏`;
    const whatsappUrl = cleanMobile
      ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(reminderMsg)}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        customer: customerObj,
        newBalance,
        whatsappUrl,
        reminderMsg,
      },
    });
  } catch (error: any) {
    console.error('Credit POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to record credit transaction' },
      { status: 500 },
    );
  }
}
