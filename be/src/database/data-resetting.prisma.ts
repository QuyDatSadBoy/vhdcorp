import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  await prisma.$transaction([
    prisma.user.deleteMany(),
  ]);
  console.log('Database has been reset.');

}
resetDatabase()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });