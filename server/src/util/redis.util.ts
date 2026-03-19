import { cacheGet, cacheSet, cacheDel, cacheInvalidate, redis } from '../lib/redis.js';
import logger from './logger.js';

export const redisClient = redis;

export const connectRedis = async () => {
    // ioredis handles connection automatically, but we can log state
    if (redis) {
       logger.info('Redis client initialized (ioredis)');
    }
};

// Re-export helpers with same signatures for compatibility
export { cacheGet, cacheSet, cacheDel };

export const cacheDelPattern = cacheInvalidate;

