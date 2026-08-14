import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
    });

    return NextResponse.json({ success: true, data: store });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch store' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const {
      name,
      phone,
      address,
      gstin,
      upiId,
      storefrontEnabled,
      themeColor,
      logoUrl,
      bannerUrl,
      tagline,
      description,
    } = body;

    const updated = await prisma.store.update({
      where: { id: user.storeId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(gstin !== undefined && { gstin }),
        ...(upiId !== undefined && { upiId }),
        ...(storefrontEnabled !== undefined && { storefrontEnabled }),
        ...(themeColor !== undefined && { themeColor }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(tagline !== undefined && { tagline }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update store' },
      { status: 500 },
    );
  }
}
