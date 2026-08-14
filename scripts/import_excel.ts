import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store found");

  console.log("Found store:", store.name);

  console.log("Cleaning up old products and categories...");
  await prisma.product.deleteMany({ where: { storeId: store.id } });
  await prisma.category.deleteMany({ where: { storeId: store.id } });

  console.log("Reading Excel file...");
  const filePath = '/Users/nihalkumar/Downloads/Export Items.xlsx';
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const json: any[] = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Found ${json.length} rows`);

  const categoryCache = new Map<string, string>();

  let importedCount = 0;

  for (const row of json) {
    const name = String(row['Item name*'] || row['Item Name'] || row.name || '').trim();
    if (!name) continue;

    const price = parseFloat(row['Sale price'] || row['Sales Price*'] || row.price || 0);
    const purchasePrice = parseFloat(row['Purchase price'] || 0);
    const stock = parseFloat(row['Current stock quantity'] || row['Opening Quantity'] || 0);
    const barcode = row['Item code'] || row['Item Code'] || row.barcode || null;
    
    // Title case the category
    let rawCat = String(row['Category'] || 'General').trim();
    if (rawCat.toLowerCase() === 'nan') rawCat = 'General';
    const categoryName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();

    let categoryId = categoryCache.get(categoryName);
    if (!categoryId) {
      const cat = await prisma.category.upsert({
        where: { name_storeId: { name: categoryName, storeId: store.id } },
        update: {},
        create: { name: categoryName, storeId: store.id },
      });
      categoryId = cat.id;
      categoryCache.set(categoryName, categoryId);
    }

    try {
      await prisma.product.create({
        data: {
          name,
          sellingPrice: price,
          purchasePrice: purchasePrice,
          stock,
          barcode: barcode ? String(barcode).trim() : undefined,
          storeId: store.id,
          categoryId,
          unit: 'pcs',
          gst: 0,
        },
      });
      importedCount++;
    } catch (e) {
      console.log(`Failed to import ${name}`, e);
    }
  }

  console.log(`Imported ${importedCount} products successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
