import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Testing DB connection...');
  try {
    await prisma.$connect();
    console.log('Successfully connected to DB');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
  } catch (e) {
    console.error('Failed to connect to DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
