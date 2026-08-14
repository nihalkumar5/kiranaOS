import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findFirst();
  if (!store) {
    console.error('No store found!');
    return;
  }

  // Create or find category
  let category = await prisma.category.findFirst({
    where: { name: 'Quick Items', storeId: store.id }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Quick Items',
        storeId: store.id
      }
    });
  }

  const products = [
    { name: 'Rajshree Gutka (1 pc)', sellingPrice: 5, purchasePrice: 4, stock: 100, unit: 'pcs', categoryId: category.id, storeId: store.id },
    { name: 'Rajshree Gutka (Packet)', sellingPrice: 125, purchasePrice: 110, stock: 10, unit: 'packet', categoryId: category.id, storeId: store.id },
    { name: 'Vimal Gutka (1 pc)', sellingPrice: 5, purchasePrice: 4, stock: 100, unit: 'pcs', categoryId: category.id, storeId: store.id },
    { name: 'Vimal Gutka (Packet)', sellingPrice: 125, purchasePrice: 110, stock: 10, unit: 'packet', categoryId: category.id, storeId: store.id },
    { name: 'Chocolate', sellingPrice: 5, purchasePrice: 4, stock: 50, unit: 'pcs', categoryId: category.id, storeId: store.id },
    { name: 'Mahua Seed', sellingPrice: 53, purchasePrice: 48, stock: 50, unit: 'kg', categoryId: category.id, storeId: store.id },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
    console.log(`Added: ${p.name}`);
  }

  console.log('All quick items added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
