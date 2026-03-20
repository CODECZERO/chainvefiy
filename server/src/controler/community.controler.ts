import { Request, Response } from 'express';
import { asyncHandler } from '../util/asyncHandler.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { submitVote, getPendingVerificationQueue, getLeaderboard } from '../dbQueries/community.Queries.js';
import { cacheGet, cacheSet, cacheDel } from '../util/redis.util.js';

export const castVote = asyncHandler(async (req: Request, res: Response) => {
  const { productId, userId, voteType, reason } = req.body;
  const result = await submitVote(productId, userId, voteType, reason);
  
  // Invalidate related caches
  await cacheDel('community:queue');
  await cacheDel('community:leaderboard');
  await cacheDel(`post:${productId}`);
  await cacheDel('posts:*');
  
  return res.status(201).json(new ApiResponse(201, result, 'Vote recorded'));
});

export const getQueue = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = 'community:queue';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Verification queue fetched (cached)'));

  try {
    const queue = await getPendingVerificationQueue();
    await cacheSet(cacheKey, queue, 300); // 5 min
    return res.json(new ApiResponse(200, queue, 'Verification queue fetched'));
  } catch {
    return res.json(new ApiResponse(200, [], 'Verification queue fetched (fallback)'));
  }
});

export const getTopVerifiers = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = 'community:leaderboard';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Leaderboard fetched (cached)'));

  const leaderboard = await getLeaderboard();
  await cacheSet(cacheKey, leaderboard, 600); // 10 min
  return res.json(new ApiResponse(200, leaderboard, 'Leaderboard fetched'));
});
