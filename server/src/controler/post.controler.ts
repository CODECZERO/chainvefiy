import { Request, Response } from 'express';
import { asyncHandler } from '../util/asyncHandler.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { getPosts, savePostData, getPostById } from '../dbQueries/post.Queries.js';
import { cacheGet, cacheSet, cacheDel } from '../util/redis.util.js';

export interface PostData {
  supplierId: string;
  title: string;
  description?: string;
  category: string;
  priceInr: number;
  quantity?: string;
  proofMediaUrls?: string[];
}

export const fetchPosts = asyncHandler(async (req: Request, res: Response) => {
  const { category, status, search } = req.query;
  const cacheKey = `posts:cat_${category}:stat_${status}:srch_${search}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Products fetched (cached)'));

  const posts = await getPosts({
    category: category as string,
    status: (status as string) || 'VERIFIED',
    search: search as string,
  });

  await cacheSet(cacheKey, posts, 300); // 5 min cache
  return res.json(new ApiResponse(200, posts, 'Products fetched'));
});

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await savePostData(req.body as PostData);
  await cacheDel('posts:*'); // Invalidate post lists
  return res.status(201).json(new ApiResponse(201, post, 'Product created'));
});

export const fetchPost = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = `post:${req.params.id}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(new ApiResponse(200, cached, 'Product fetched (cached)'));

  const post = await getPostById(req.params.id as string);
  if (!post) return res.status(404).json(new ApiResponse(404, null, 'Product not found'));

  await cacheSet(cacheKey, post, 600); // 10 min cache
  return res.json(new ApiResponse(200, post, 'Product fetched'));
});
