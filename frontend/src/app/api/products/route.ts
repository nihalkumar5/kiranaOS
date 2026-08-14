import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const barcode = searchParams.get('barcode');
    const categoryId = searchParams.get('categoryId');

    const whereClause: any = {
      storeId: user.storeId,
    };

    if (barcode) {
      whereClause.barcode = barcode;
    } else if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { barcode: { contains: query } },
        { brand: { contains: query } },
      ];
    }

    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch products' },
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
      name,
      barcode,
      image,
      categoryId,
      purchasePrice,
      sellingPrice,
      stock,
      unit = 'pcs',
      brand,
      gst = 0,
    } = body;

    if (!name || sellingPrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'Product name and selling price are required' },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        barcode: barcode?.trim() || null,
        image: image || null,
        categoryId: categoryId || null,
        purchasePrice: parseFloat(purchasePrice || '0'),
        sellingPrice: parseFloat(sellingPrice || '0'),
        stock: parseFloat(stock || '0'),
        unit: unit.trim() || 'pcs',
        brand: brand?.trim() || null,
        gst: parseFloat(gst || '0'),
        storeId: user.storeId,
      },
      include: { category: true },
    });

    // Record initial inventory transaction if stock > 0
    if (parseFloat(stock || '0') > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          storeId: user.storeId,
          productId: product.id,
          userId: user.sub,
          type: 'PURCHASE',
          quantity: parseFloat(stock || '0'),
          beforeStock: 0,
          afterStock: parseFloat(stock || '0'),
          description: 'Initial stock on product creation',
        },
      });
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create product' },
      { status: 500 },
    );
  }
}
