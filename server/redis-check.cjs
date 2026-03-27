const Redis = require('ioredis');
require('dotenv').config();

async function check() {
  const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  try {
    const res = await redis.ping();
    console.log('Redis OK:', res);
  } catch (e) {
    console.error('Redis Error:', e.message);
  } finally {
    redis.disconnect();
  }
}

check();
