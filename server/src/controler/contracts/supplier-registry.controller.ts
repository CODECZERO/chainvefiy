import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { supplierRegistryService } from '../../services/stellar/supplier-registry.service.js';

const initialize = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey } = req.body;
  if (!adminKey) throw new ApiError(400, 'Admin key is required');
  const result = await supplierRegistryService.initialize(adminKey);
  return res.status(200).json(new ApiResponse(200, result, 'Supplier registry initialized'));
});

const register = AsyncHandler(async (req: Request, res: Response) => {
  const { ownerKey, name, category, rank, trustScore } = req.body;
  if (!ownerKey || !name || !category || !rank || trustScore === undefined) throw new ApiError(400, 'Missing required fields');
  const result = await supplierRegistryService.register(ownerKey, name, category, rank, trustScore);
  return res.status(200).json(new ApiResponse(200, result, 'Reaper registered'));
});

const updatePower = AsyncHandler(async (req: Request, res: Response) => {
  const { ownerKey, newScore } = req.body;
  if (!ownerKey || newScore === undefined) throw new ApiError(400, 'Owner key and new score are required');
  const result = await supplierRegistryService.updateTrustScore(ownerKey, newScore);
  return res.status(200).json(new ApiResponse(200, result, 'Power updated'));
});

const promote = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, ownerAddress, newRank } = req.body;
  if (!adminKey || !ownerAddress || !newRank) throw new ApiError(400, 'Missing required fields');
  const result = await supplierRegistryService.promote(adminKey, ownerAddress, newRank);
  return res.status(200).json(new ApiResponse(200, result, 'Reaper promoted'));
});

const suspend = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, ownerAddress } = req.body;
  if (!adminKey || !ownerAddress) throw new ApiError(400, 'Admin key and owner address are required');
  const result = await supplierRegistryService.suspend(adminKey, ownerAddress);
  return res.status(200).json(new ApiResponse(200, result, 'Reaper suspended'));
});

const reinstate = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, ownerAddress } = req.body;
  if (!adminKey || !ownerAddress) throw new ApiError(400, 'Admin key and owner address are required');
  const result = await supplierRegistryService.reinstate(adminKey, ownerAddress);
  return res.status(200).json(new ApiResponse(200, result, 'Reaper reinstated'));
});

const setDivisionCapacity = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, category, capacity } = req.body;
  if (!adminKey || !category || !capacity) throw new ApiError(400, 'Missing required fields');
  const result = await supplierRegistryService.setCategoryCapacity(adminKey, category, capacity);
  return res.status(200).json(new ApiResponse(200, result, 'Division capacity set'));
});

const getReaper = AsyncHandler(async (req: Request, res: Response) => {
  const { ownerAddress } = req.params;
  if (!ownerAddress) throw new ApiError(400, 'Owner address is required');
  const reaper = await supplierRegistryService.getSupplier(ownerAddress as string);
  return res.status(200).json(new ApiResponse(200, reaper, 'Reaper retrieved'));
});

const getByDivision = AsyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  if (!category) throw new ApiError(400, 'Category is required');
  const reapers = await supplierRegistryService.getByCategory(parseInt(category as string));
  return res.status(200).json(new ApiResponse(200, reapers, 'Reapers retrieved'));
});

const getAll = AsyncHandler(async (req: Request, res: Response) => {
  const reapers = await supplierRegistryService.getAll();
  return res.status(200).json(new ApiResponse(200, reapers, 'All reapers retrieved'));
});

const getPowerHistory = AsyncHandler(async (req: Request, res: Response) => {
  const { ownerAddress } = req.params;
  if (!ownerAddress) throw new ApiError(400, 'Owner address is required');
  const history = await supplierRegistryService.getTrustHistory(ownerAddress as string);
  return res.status(200).json(new ApiResponse(200, history, 'Power history retrieved'));
});

const totalReapers = AsyncHandler(async (req: Request, res: Response) => {
  const total = await supplierRegistryService.totalSuppliers();
  return res.status(200).json(new ApiResponse(200, { total }, 'Total reapers retrieved'));
});

export {
  initialize,
  register,
  updatePower,
  promote,
  suspend,
  reinstate,
  setDivisionCapacity,
  getReaper,
  getByDivision,
  getAll,
  getPowerHistory,
  totalReapers
};
