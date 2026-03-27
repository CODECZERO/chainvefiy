const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

async function test() {
  console.log('--- STARTING SIMPLE DIAGNOSTIC ---');
  
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    console.log('Testing Redis...');
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
    try {
      await redis.ping();
      console.log('Redis OK');
    } catch (e) {
      console.log('Redis Error:', e.message);
    } finally {
      redis.disconnect();
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('Testing Postgres...');
    const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
    try {
      const res = await pool.query('SELECT 1');
      console.log('Postgres OK:', res.rows);
    } catch (e) {
      console.log('Postgres Error:', e.message);
    } finally {
      await pool.end();
    }
  }
}

test();
