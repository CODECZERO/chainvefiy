import Redis from 'ioredis';

// ─── Redis Client ───
// Graceful fallback: if Redis is unavailable, all operations silently return null/void
// so the app keeps working with direct Postgres queries.

let redis: Redis | null = null;

try {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  // Upstash TLS uses `redis://...` with `--tls` OR `rediss://...`.
  const useTls = redisUrl.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    ...(useTls ? { tls: {} } : {}),
  });

  redis.on('error', (err) => {
    console.warn('[REDIS] Connection error (falling back to Postgres):', err.message);
  });

  redis.on('connect', () => {
    console.log('[REDIS] Connected successfully');
  });

  // Attempt connection
  redis.connect().catch(() => {
    console.warn('[REDIS] Initial connection failed — running without cache');
    redis = null;
  });
} catch (err) {
  console.warn('[REDIS] Failed to initialize — running without cache');
  redis = null;
}

// ─── Cache Helpers ───

/**
 * Get cached data by key. Returns parsed JSON or null.
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Set cache with TTL (seconds). Silently fails if Redis is down.
 */
export async function cacheSet(key: string, data: any, ttlSeconds: number = 60): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Silent fail
  }
}

/**
 * Invalidate all keys matching a glob pattern (e.g. "products:*").
 * Uses SCAN to avoid blocking Redis with KEYS command.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Silent fail
  }
}

/**
 * Delete a single cache key.
 */
export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Silent fail
  }
}

/**
 * Create a deterministic cache key from query params.
 */
export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${prefix}:${sorted || 'default'}`;
}

export { redis };
