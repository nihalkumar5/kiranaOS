import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const query = (
      searchParams.get('q') ||
      searchParams.get('query') ||
      searchParams.get('search') ||
      ''
    ).trim();
    const barcode = searchParams.get('barcode')?.trim();
    const categoryId = searchParams.get('categoryId');

    const cacheKey = `products:${user.storeId}`;

    // Fast-path: Check store products cache
    let allProducts = getCached<any[]>(cacheKey);
    if (!allProducts) {
      allProducts = await prisma.product.findMany({
        where: { storeId: user.storeId },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      setCached(cacheKey, allProducts);
    }

    // Filter in-memory for sub-millisecond response time
    let filtered = allProducts;

    if (barcode) {
      filtered = filtered.filter((p) => p.barcode === barcode);
    } else if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)),
      );
    }

    if (categoryId && categoryId !== 'all') {
      filtered = filtered.filter((p) => p.categoryId === categoryId);
    }

    return NextResponse.json(
      { success: true, data: filtered },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-transform',
        },
      },
    );
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

    // Invalidate product cache for this store
    invalidateCache(`products:${user.storeId}`);

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create product' },
      { status: 500 },
    );
  }
}
