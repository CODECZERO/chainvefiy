import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { productRegistryService } from '../../services/stellar/product-registry.service.js';

const initialize = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey } = req.body;
  if (!adminKey) throw new ApiError(400, 'Admin key is required');
  const result = await productRegistryService.initialize(adminKey);
  return res.status(200).json(new ApiResponse(200, result, 'Mission Registry initialized'));
});

const setBadgeContract = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, badgeContractAddress } = req.body;
  if (!adminKey || !badgeContractAddress) throw new ApiError(400, 'Admin key and badge contract address are required');
  const result = await productRegistryService.setBadgeContract(adminKey, badgeContractAddress);
  return res.status(200).json(new ApiResponse(200, result, 'Badge contract set'));
});

const setTokenContract = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, tokenContractAddress } = req.body;
  if (!adminKey || !tokenContractAddress) throw new ApiError(400, 'Admin key and token contract address are required');
  const result = await productRegistryService.setTokenContract(adminKey, tokenContractAddress);
  return res.status(200).json(new ApiResponse(200, result, 'Token contract set'));
});

const registerMission = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierKey, productId, title, riskLevel, deadline } = req.body;
  if (!supplierKey || !productId || !title || riskLevel === undefined) throw new ApiError(400, 'Missing required fields');
  const result = await productRegistryService.registerProduct(supplierKey, productId, title, riskLevel, deadline);
  return res.status(200).json(new ApiResponse(200, result, 'Mission registered'));
});

const advanceStatus = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierKey, productId } = req.body;
  if (!supplierKey || !productId) throw new ApiError(400, 'Supplier key and product ID are required');
  const result = await productRegistryService.advanceStatus(supplierKey, productId);
  return res.status(200).json(new ApiResponse(200, result, 'Mission status advanced'));
});

const sealProof = AsyncHandler(async (req: Request, res: Response) => {
  const { validatorKey, sellerAddress, productId, proofCid } = req.body;
  if (!validatorKey || !sellerAddress || !productId || !proofCid) throw new ApiError(400, 'Missing required fields');
  const result = await productRegistryService.verifyProof(validatorKey, sellerAddress, productId, proofCid);
  return res.status(200).json(new ApiResponse(200, result, 'Proof sealed'));
});

const failMission = AsyncHandler(async (req: Request, res: Response) => {
  const { callerKey, productId } = req.body;
  if (!callerKey || !productId) throw new ApiError(400, 'Caller key and product ID are required');
  const result = await productRegistryService.failProduct(callerKey, productId);
  return res.status(200).json(new ApiResponse(200, result, 'Mission failed'));
});

const getMission = AsyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  if (!productId) throw new ApiError(400, 'Product ID is required');
  const mission = await productRegistryService.getProduct(productId as string);
  return res.status(200).json(new ApiResponse(200, mission, 'Mission retrieved'));
});

const getProof = AsyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  if (!productId) throw new ApiError(400, 'Product ID is required');
  const proof = await productRegistryService.getProof(productId as string);
  return res.status(200).json(new ApiResponse(200, proof, 'Proof retrieved'));
});

const getCounter = AsyncHandler(async (req: Request, res: Response) => {
  const counter = await productRegistryService.getCounter();
  return res.status(200).json(new ApiResponse(200, counter, 'Counter retrieved'));
});

const getMissionsByCaptain = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierAddress } = req.params;
  if (!supplierAddress) throw new ApiError(400, 'Supplier address is required');
  const missions = await productRegistryService.getProductsBySupplier(supplierAddress as string);
  return res.status(200).json(new ApiResponse(200, missions, 'Missions retrieved'));
});

const getValidators = AsyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  if (!productId) throw new ApiError(400, 'Product ID is required');
  const validators = await productRegistryService.getValidators(productId as string);
  return res.status(200).json(new ApiResponse(200, validators, 'Validators retrieved'));
});

export {
  initialize,
  setBadgeContract,
  setTokenContract,
  registerMission,
  advanceStatus,
  sealProof,
  failMission,
  getMission,
  getProof,
  getCounter,
  getMissionsByCaptain,
  getValidators
};
