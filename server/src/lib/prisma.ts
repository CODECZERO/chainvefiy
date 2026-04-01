import 'dotenv/config';
import dns from 'dns';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

// CRITICAL: Force Node to skip IPv6. Supabase port 5432 has broken IPv6 routes for many ISPs.
// Placing this inside the module fixes ES6 import hoisting executing it too late.
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

type PrismaClientType = PrismaClient;
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientType;
  pgPool?: pg.Pool;
};

console.log('[PRISMA] Initializing client adapter...');
console.log('[PRISMA] DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  // PgBouncer (Supabase Connection Pooler on port 6543) handles server-side connection recycling.
  // Our local pool just manages sockets to PgBouncer — these are fast, reliable, and don't get
  // killed by firewalls because PgBouncer responds immediately to keepalives.
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  pool.on('error', (err) => {
    console.error('[PRISMA] Pool background error:', err.message);
  });

  const adapter = new PrismaPg(pool);

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  globalForPrisma.pgPool = pool;

  console.log('[PRISMA] New Prisma Client created with pg adapter (max: 15)');

  // Critical fix for hot-reload connection exhaustions (Zombies in Supabase)
  // Cleanly close the Pg Pool on graceful shutdown so TCP sockets don't linger
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[PRISMA] Received ${signal}. Closing pg.Pool to free Supabase connections...`);
    if (globalForPrisma.pgPool) {
      try {
        await globalForPrisma.pgPool.end();
        console.log('[PRISMA] Pool drained and closed.');
      } catch (e) {
        console.error('[PRISMA] Error closing pool:', e);
      }
    }
    process.exit(0);
  };

  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  // Nodemon uses SIGUSR2 to restart
  process.once('SIGUSR2', async () => gracefulShutdown('SIGUSR2'));

} else {
  console.log('[PRISMA] Reusing existing Prisma adapter across hot-reloads');
}

export const prisma = globalForPrisma.prisma as PrismaClientType;