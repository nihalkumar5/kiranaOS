import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, storeName, storePhone, storeAddress } = body;

    if (!email || !password || !name || !storeName) {
      return NextResponse.json(
        { success: false, message: 'Please fill all required fields.' },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists.' },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create store and admin user in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: storeName,
          phone: storePhone || null,
          address: storeAddress || null,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'ADMIN',
          storeId: store.id,
        },
      });

      // Seed common default grocery categories
      const defaultCategories = [
        'Snacks & Biscuits',
        'Beverages & Drinks',
        'Dairy & Bread',
        'Atta, Rice & Dal',
        'Oil & Masala',
        'Personal Care',
        'Cleaning & Household',
      ];

      for (const catName of defaultCategories) {
        await tx.category.create({
          data: {
            name: catName,
            storeId: store.id,
          },
        });
      }

      return { user, store };
    });

    const tokenPayload = {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      storeId: result.store.id,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          },
          store: result.store,
          accessToken,
          refreshToken,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Registration failed' },
      { status: 500 },
    );
  }
}
