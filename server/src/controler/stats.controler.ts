import { Request, Response } from 'express';
import { asyncHandler } from '../util/asyncHandler.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { getStats } from '../dbQueries/order.Queries.js';
import { cacheGet, cacheSet } from '../util/redis.util.js';

export const fetchStats = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = 'global:stats';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Stats fetched (cached)'));

  try {
    const stats = await Promise.race([
      getStats(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000)),
    ]);
    await cacheSet(cacheKey, stats, 300); // 5 min
    return res.json(new ApiResponse(200, stats, 'Stats fetched'));
  } catch (e) {
    const fallback = { totalSalesUsdc: 0, totalOrders: 0, totalProducts: 0, verifiedProducts: 0, flaggedProducts: 0 };
    return res.json(new ApiResponse(200, fallback, 'Stats fetched (fallback)'));
  }
});
