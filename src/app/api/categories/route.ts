import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const categories = await prisma.category.findMany({
      where: { storeId: user.storeId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch categories' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 },
      );
    }

    const category = await prisma.category.upsert({
      where: {
        name_storeId: {
          name: name.trim(),
          storeId: user.storeId,
        },
      },
      update: {},
      create: {
        name: name.trim(),
        storeId: user.storeId,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create category' },
      { status: 500 },
    );
  }
}
