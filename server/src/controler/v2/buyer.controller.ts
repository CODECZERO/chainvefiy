import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { getBuyerProfileByUserId, updateBuyerProfileQuery } from '../../dbQueries/buyer.Queries.js';

export const getBuyerProfile = AsyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const profile = await getBuyerProfileByUserId(userId);
  return res.status(200).json(new ApiResponse(200, profile, 'Buyer profile fetched successfully'));
});

export const updateBuyerProfile = AsyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const { fullName, phoneNumber, address, city, state, pincode, country } = req.body;

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
