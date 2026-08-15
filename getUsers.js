const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  
  if (users.length > 0) {
    const defaultUser = users[0];
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: defaultUser.id },
      data: { passwordHash: hashedPassword }
    });
    console.log(`Reset password for ${defaultUser.email} to: ${newPassword}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
