const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.product.updateMany({
    where: { name: { contains: 'Amla Juice' } },
    data: { image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Captain Cook Salt' } },
    data: { image: 'https://images.unsplash.com/photo-1615486511484-92e172054a04?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Red Label Tea' } },
    data: { image: 'https://images.unsplash.com/photo-1594847253504-20539655513d?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Kissan Ketchup' } },
    data: { image: 'https://images.unsplash.com/photo-1607689108173-9828eece6b70?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Coca-Cola' } },
    data: { image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Lay' } },
    data: { image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Amul Butter' } },
    data: { image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Maggi' } },
    data: { image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Fortune Mustard Oil' } },
    data: { image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Sugar' } },
    data: { image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Tata Salt' } },
    data: { image: 'https://images.unsplash.com/photo-1615486511484-92e172054a04?w=300&h=300&fit=crop' }
  });
  await prisma.product.updateMany({
    where: { name: { contains: 'Mother Dairy' } },
    data: { image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop' }
  });
  console.log('Images updated successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
