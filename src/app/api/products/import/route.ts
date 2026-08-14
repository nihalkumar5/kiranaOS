import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { storeId } = auth;
    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ success: false, message: 'No products provided' }, { status: 400 });
    }

    // Default category ID for unassigned items
    let defaultCategory = await prisma.category.findFirst({
      where: { storeId, name: 'General' },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'General', storeId },
      });
    }

    let importedCount = 0;

    for (const item of products) {
      try {
        const name = String(item.name || '').trim();
        if (!name) continue;

        const price = parseFloat(item.price) || 0;
        const stock = parseFloat(item.stock) || 0;
        const barcode = item.barcode ? String(item.barcode).trim() : null;

        // Skip if a product with same barcode already exists
        if (barcode) {
          const existing = await prisma.product.findUnique({
            where: { barcode_storeId: { barcode, storeId } },
          });
          if (existing) continue;
        }

        await prisma.product.create({
          data: {
            name,
            sellingPrice: price,
            purchasePrice: price,
            stock,
            barcode: barcode || undefined,
            storeId,
            categoryId: defaultCategory.id,
            unit: 'pcs',
            gst: 0,
          },
        });
        importedCount++;
      } catch (e) {
        console.error('Error importing row', item, e);
      }
    }

    return NextResponse.json({ success: true, imported: importedCount });
  } catch (error: any) {
    console.error('Bulk Import Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to import products' },
      { status: 500 }
    );
  }
}
