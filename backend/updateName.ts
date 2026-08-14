import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.store.updateMany({
    data: { name: 'RamPrasad Kirana Store' },
  });
  console.log('Store name updated successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
