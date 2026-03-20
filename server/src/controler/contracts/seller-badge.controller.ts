import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { sellerBadgeService } from '../../services/stellar/seller-badge.service.js';

const initialize = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey } = req.body;
  if (!adminKey) throw new ApiError(400, 'Admin key is required');
  const result = await sellerBadgeService.initialize(adminKey);
  return res.status(200).json(new ApiResponse(200, result, 'Seller badge initialized'));
});

const mint = AsyncHandler(async (req: Request, res: Response) => {
  const { reaperAddress, missionId, rank } = req.body;
  if (!reaperAddress || !missionId || !rank) throw new ApiError(400, 'Missing required fields');
  const result = await sellerBadgeService.mint(reaperAddress, missionId, rank);
  return res.status(200).json(new ApiResponse(200, result, 'Badge minted'));
});

const revoke = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, reaperAddress, missionId } = req.body;
  if (!adminKey || !reaperAddress || !missionId) throw new ApiError(400, 'Missing required fields');
  const result = await sellerBadgeService.revoke(adminKey, reaperAddress, missionId);
  return res.status(200).json(new ApiResponse(200, result, 'Badge revoked'));
});

const getBadges = AsyncHandler(async (req: Request, res: Response) => {
  const { reaperAddress } = req.params;
  if (!reaperAddress) throw new ApiError(400, 'Reaper address is required');
  const badges = await sellerBadgeService.getBadges(String(reaperAddress));
  return res.status(200).json(new ApiResponse(200, badges, 'Badges retrieved'));
});

const verifyBadge = AsyncHandler(async (req: Request, res: Response) => {
  const { reaperAddress, missionId } = req.params;
  if (!reaperAddress || !missionId) throw new ApiError(400, 'Reaper address and mission ID are required');
  const verified = await sellerBadgeService.verifyBadge(String(reaperAddress), String(missionId));
  return res.status(200).json(new ApiResponse(200, { verified }, 'Badge verification result'));
});

const badgeCount = AsyncHandler(async (req: Request, res: Response) => {
  const { reaperAddress } = req.params;
  if (!reaperAddress) throw new ApiError(400, 'Reaper address is required');
  const count = await sellerBadgeService.badgeCount(String(reaperAddress));
  return res.status(200).json(new ApiResponse(200, { count }, 'Badge count retrieved'));
});

const totalBadges = AsyncHandler(async (req: Request, res: Response) => {
  const total = await sellerBadgeService.totalBadges();
  return res.status(200).json(new ApiResponse(200, { total }, 'Total badges retrieved'));
});

const getTopReapers = AsyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const topSellers = await sellerBadgeService.getTopSellers(limit);
  return res.status(200).json(new ApiResponse(200, topSellers, 'Top sellers retrieved'));
});

export {
  initialize,
  mint,
  revoke,
  getBadges,
  verifyBadge,
  badgeCount,
  totalBadges,
  getTopReapers
};
