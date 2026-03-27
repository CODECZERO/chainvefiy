import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const { Pool } = pg;

type PrismaClientType = PrismaClient;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

console.log('[PRISMA] Initializing client...');
console.log('[PRISMA] DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  const pool = new Pool({ 
    connectionString,
    max: 20, // Increase max connections slightly
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });
  
  const adapter = new PrismaPg(pool);
  
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  console.log('[PRISMA] New client created with adapter');
} else {
  console.log('[PRISMA] Reusing existing client');
}

export const prisma = globalForPrisma.prisma as PrismaClientType;
