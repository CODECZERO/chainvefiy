import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { prisma } from '../lib/prisma.js';

// GET user profile with their orders and listings
const getUserProfile = AsyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id || (req as any).user?.id;
  if (!userId) throw new ApiError(400, 'User ID required');

  const user = await prisma.user.findUnique({
    where: { id: userId as string },
    include: {
      supplierProfile: {
        include: {
          products: { where: { status: 'VERIFIED' }, take: 10, orderBy: { createdAt: 'desc' } },
          badges: true,
        },
      },
      buyerOrders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { title: true, priceInr: true } } },
      },
      trustTokens: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!user) throw new ApiError(404, 'User not found');

  // Calculate total trust tokens
  const totalTokens = await prisma.trustTokenLedger.aggregate({
    where: { userId: userId as string },
    _sum: { amount: true },
  });

  return res.json(new ApiResponse(200, {
    ...user,
    totalTrustTokens: totalTokens._sum.amount || 0,
  }, 'Profile fetched'));
});

// GET wallet profile by Stellar address
const getWalletProfile = AsyncHandler(async (req: Request, res: Response) => {
  const { walletAddr } = req.params;

  const user = await prisma.user.findFirst({
    where: { stellarWallet: walletAddr as string },
    include: {
      supplierProfile: { include: { products: { where: { status: 'VERIFIED' }, take: 10 } } },
    },
  });

  if (!user) throw new ApiError(404, 'Wallet not found');
  return res.json(new ApiResponse(200, user, 'Wallet profile fetched'));
});

export { getUserProfile, getWalletProfile };
