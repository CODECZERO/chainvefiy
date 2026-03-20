import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
  console.log('Testing DB connection...');
  try {
    await prisma.$connect();
    console.log('Successfully connected to Postgres!');
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
  } catch (e) {
    console.error('DB Connection Failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
