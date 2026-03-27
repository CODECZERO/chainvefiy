import { PrismaClient } from './src/generated/prisma/index.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

dotenv.config();

async function diagnose() {
  console.log('--- DIAGNOSING CONNECTIONS ---');
  
  // 1. Check Redis
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    console.log('Checking Redis...');
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });
    
    try {
      await redis.ping();
      console.log('✅ Redis connected successfully');
    } catch (e: any) {
      console.error('❌ Redis connection failed:', e.message);
    } finally {
      redis.disconnect();
    }
  }

  // 2. Check Postgres (Prisma)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('Checking Postgres via Prisma...');
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    try {
      const start = Date.now();
      await prisma.$connect();
      console.log(`✅ Prisma connected in ${Date.now() - start}ms`);
      
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      console.log('✅ Query successful:', result);
    } catch (e: any) {
      console.error('❌ Prisma connection/query failed:', e.message);
      if (e.code) console.error('Error Code:', e.code);
    } finally {
      await prisma.$disconnect();
    }
  }
}

diagnose();
