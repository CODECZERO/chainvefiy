import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { getBuyerProfileByUserId, updateBuyerProfileQuery } from '../../dbQueries/buyer.Queries.js';

export const getBuyerProfile = AsyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id;
  const stellarWallet = req.query.stellarWallet as string;

  if (!userId && !stellarWallet) {
    throw new ApiError(400, 'User ID or Stellar Wallet required');
  }

  let profile;
  if (userId) {
    profile = await getBuyerProfileByUserId(userId);
  } else {
    // Find user by wallet first
    const { prisma } = await import('../../lib/prisma.js');
    const user = await prisma.user.findUnique({ where: { stellarWallet } });
    if (user) {
      profile = await getBuyerProfileByUserId(user.id);
    }
  }

  return res.status(200).json(new ApiResponse(200, profile, 'Buyer profile fetched successfully'));
});

export const updateBuyerProfile = AsyncHandler(async (req: any, res: Response) => {
  let userId = req.user?.id;
  const { stellarWallet, fullName, phoneNumber, address, city, state, pincode, country } = req.body;

  if (!userId && !stellarWallet) {
    throw new ApiError(400, 'User ID or Stellar Wallet required');
  }

  if (!userId && stellarWallet) {
    const { findOrCreateUserByWallet } = await import('../../dbQueries/buyer.Queries.js');
    const user = await findOrCreateUserByWallet(stellarWallet);
    userId = user.id;
  }

  const profile = await updateBuyerProfileQuery(userId, {
    fullName,
    phoneNumber,
    address,
    city,
    state,
    pincode,
    country
  });

  return res.status(200).json(new ApiResponse(200, profile, 'Buyer profile updated successfully'));
});
