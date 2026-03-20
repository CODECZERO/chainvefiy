import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { treasuryService } from '../../services/stellar/treasury.service.js';

const initialize = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, multiSigThreshold, requiredApprovals } = req.body;
  if (!adminKey || !multiSigThreshold || !requiredApprovals) throw new ApiError(400, 'Missing required fields');
  const result = await treasuryService.initialize(adminKey, BigInt(multiSigThreshold), requiredApprovals);
  return res.status(200).json(new ApiResponse(200, result, 'Treasury initialized'));
});

const addSigner = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, signerAddress } = req.body;
  if (!adminKey || !signerAddress) throw new ApiError(400, 'Admin key and signer address are required');
  const result = await treasuryService.addSigner(adminKey, signerAddress);
  return res.status(200).json(new ApiResponse(200, result, 'Signer added'));
});

const deposit = AsyncHandler(async (req: Request, res: Response) => {
  const { dividerKey, amount, purpose } = req.body;
  if (!dividerKey || !amount || !purpose) throw new ApiError(400, 'Missing required fields');
  const result = await treasuryService.deposit(dividerKey, BigInt(amount), purpose);
  return res.status(200).json(new ApiResponse(200, result, 'Funds deposited'));
});

const withdraw = AsyncHandler(async (req: Request, res: Response) => {
  const { dividerKey, amount, purpose } = req.body;
  if (!dividerKey || !amount || !purpose) throw new ApiError(400, 'Missing required fields');
  const result = await treasuryService.withdraw(dividerKey, BigInt(amount), purpose);
  return res.status(200).json(new ApiResponse(200, result, 'Withdrawal requested'));
});

const approveWithdrawal = AsyncHandler(async (req: Request, res: Response) => {
  const { signerKey, requestId } = req.body;
  if (!signerKey || requestId === undefined) throw new ApiError(400, 'Signer key and request ID are required');
  const result = await treasuryService.approveWithdrawal(signerKey, requestId);
  return res.status(200).json(new ApiResponse(200, result, 'Withdrawal approved'));
});

const setBudget = AsyncHandler(async (req: Request, res: Response) => {
  const { adminKey, divisionAddress, maxAmount } = req.body;
  if (!adminKey || !divisionAddress || !maxAmount) throw new ApiError(400, 'Missing required fields');
  const result = await treasuryService.setBudget(adminKey, divisionAddress, BigInt(maxAmount));
  return res.status(200).json(new ApiResponse(200, result, 'Budget set'));
});

const getBalance = AsyncHandler(async (req: Request, res: Response) => {
  const { dividerAddress } = req.params;
  if (!dividerAddress) throw new ApiError(400, 'Divider address is required');
  const balance = await treasuryService.getBalance(dividerAddress as string);
  return res.status(200).json(new ApiResponse(200, { balance: balance.toString() }, 'Balance retrieved'));
});

const getHistory = AsyncHandler(async (req: Request, res: Response) => {
  const { dividerAddress } = req.params;
  if (!dividerAddress) throw new ApiError(400, 'Divider address is required');
  const history = await treasuryService.getHistory(dividerAddress as string);
  return res.status(200).json(new ApiResponse(200, history, 'History retrieved'));
});

const getRequest = AsyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  if (!requestId) throw new ApiError(400, 'Request ID is required');
  const request = await treasuryService.getRequest(parseInt(requestId as string));
  return res.status(200).json(new ApiResponse(200, request, 'Request retrieved'));
});

const getBudget = AsyncHandler(async (req: Request, res: Response) => {
  const { divisionAddress } = req.params;
  if (!divisionAddress) throw new ApiError(400, 'Division address is required');
  const budget = await treasuryService.getBudget(divisionAddress as string);
  return res.status(200).json(new ApiResponse(200, { budget: budget.toString() }, 'Budget retrieved'));
});

export {
  initialize,
  addSigner,
  deposit,
  withdraw,
  approveWithdrawal,
  setBudget,
  getBalance,
  getHistory,
  getRequest,
  getBudget
};
