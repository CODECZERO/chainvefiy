import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { productVault } from '../../services/stellar/product-vault.service.js';

const put = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id, data } = req.body;
  if (!collection || !id || !data) throw new ApiError(400, 'Collection, ID, and data are required');
  await productVault.put(collection, id, data);
  return res.status(200).json(new ApiResponse(200, null, 'Data stored'));
});

const get = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const data = await productVault.get(collection as string, id as string);
  return res.status(200).json(new ApiResponse(200, data, 'Data retrieved'));
});

const getMeta = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const meta = await productVault.getMeta(collection as string, id as string);
  return res.status(200).json(new ApiResponse(200, meta, 'Metadata retrieved'));
});

const getDeltas = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const deltas = await productVault.getDeltas(collection as string, id as string);
  return res.status(200).json(new ApiResponse(200, deltas, 'Deltas retrieved'));
});

const bloomCheck = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const exists = await productVault.bloomCheck(collection as string, id as string);
  return res.status(200).json(new ApiResponse(200, { exists }, 'Bloom check result'));
});

const has = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.params;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const exists = await productVault.has(collection as string, id as string);
  return res.status(200).json(new ApiResponse(200, { exists }, 'Existence check result'));
});

const getIndex = AsyncHandler(async (req: Request, res: Response) => {
  const { collection } = req.params;
  if (!collection) throw new ApiError(400, 'Collection is required');
  const index = await productVault.getIndex(collection as string);
  return res.status(200).json(new ApiResponse(200, index, 'Index retrieved'));
});

const getStats = AsyncHandler(async (req: Request, res: Response) => {
  const stats = await productVault.getStats();
  return res.status(200).json(new ApiResponse(200, stats, 'Stats retrieved'));
});

const migrateToCold = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.body;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const result = await productVault.migrateToCold(collection, id);
  return res.status(200).json(new ApiResponse(200, result, 'Entry migrated to cold storage'));
});

const deleteEntry = AsyncHandler(async (req: Request, res: Response) => {
  const { collection, id } = req.body;
  if (!collection || !id) throw new ApiError(400, 'Collection and ID are required');
  const result = await productVault.delete(collection, id);
  return res.status(200).json(new ApiResponse(200, result, 'Entry deleted'));
});

export {
  put,
  get,
  getMeta,
  getDeltas,
  bloomCheck,
  has,
  getIndex,
  getStats,
  migrateToCold,
  deleteEntry
};
