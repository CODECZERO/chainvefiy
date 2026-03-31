import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { escrowService } from '../../services/stellar/escrow.service.js';

// Build transaction XDR endpoints
const buildCreateEscrowTx = AsyncHandler(async (req: Request, res: Response) => {
  const { buyerPublicKey, supplierPublicKey, totalAmount, lockedAmount, taskId, deadline, asset } = req.body;
  
  if (!buyerPublicKey || !supplierPublicKey || !totalAmount || !lockedAmount || !taskId) {
    throw new ApiError(400, 'Missing required fields');
  }

  const { xdr, classicFallback } = await escrowService.buildCreateEscrowTx(
    buyerPublicKey,
    supplierPublicKey,
    totalAmount,
    lockedAmount,
    taskId,
    deadline || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    asset
  );

  return res.status(200).json(new ApiResponse(200, { xdr, classicFallback }, 'Escrow transaction built'));
});

const buildSubmitProofTx = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierPublicKey, taskId, proofCid } = req.body;
  
  if (!supplierPublicKey || !taskId || !proofCid) {
    throw new ApiError(400, 'Missing required fields');
  }

  const xdr = await escrowService.buildSubmitProofTx(supplierPublicKey, taskId, proofCid);
  return res.status(200).json(new ApiResponse(200, { xdr }, 'Submit proof transaction built'));
});

const buildVoteTx = AsyncHandler(async (req: Request, res: Response) => {
  const { voterPublicKey, taskId, isScam } = req.body;
  
  if (!voterPublicKey || !taskId || typeof isScam !== 'boolean') {
    throw new ApiError(400, 'Missing required fields');
  }

  const xdr = await escrowService.buildVoteTx(voterPublicKey, taskId, isScam);
  return res.status(200).json(new ApiResponse(200, { xdr }, 'Vote transaction built'));
});

const buildRequestReturnTx = AsyncHandler(async (req: Request, res: Response) => {
  const { buyerPublicKey, taskId } = req.body;
  
  if (!buyerPublicKey || !taskId) {
    throw new ApiError(400, 'Missing required fields');
  }

  const xdr = await escrowService.buildRequestReturnTx(buyerPublicKey, taskId);
  return res.status(200).json(new ApiResponse(200, { xdr }, 'Request return transaction built'));
});

const buildConfirmReturnTx = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierPublicKey, taskId } = req.body;
  
  if (!supplierPublicKey || !taskId) {
    throw new ApiError(400, 'Missing required fields');
  }

  const xdr = await escrowService.buildConfirmReturnTx(supplierPublicKey, taskId);
  return res.status(200).json(new ApiResponse(200, { xdr }, 'Confirm return transaction built'));
});

// Admin execution endpoints
const releaseEscrow = AsyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.body;
  
  if (!taskId) {
    throw new ApiError(400, 'Task ID is required');
  }

  const result = await escrowService.releaseEscrow(taskId);
  return res.status(200).json(new ApiResponse(200, result, 'Escrow released'));
});

const disputeEscrow = AsyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.body;
  
  if (!taskId) {
    throw new ApiError(400, 'Task ID is required');
  }

  const result = await escrowService.disputeEscrow(taskId);
  return res.status(200).json(new ApiResponse(200, result, 'Escrow disputed'));
});

const refundEscrow = AsyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.body;
  
  if (!taskId) {
    throw new ApiError(400, 'Task ID is required');
  }

  const result = await escrowService.refundEscrow(taskId);
  return res.status(200).json(new ApiResponse(200, result, 'Escrow refunded'));
});

// Query endpoints
const getEscrow = AsyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  if (!taskId) {
    throw new ApiError(400, 'Task ID is required');
  }

  const escrow = await escrowService.getEscrow(taskId as string);
  return res.status(200).json(new ApiResponse(200, escrow, 'Escrow retrieved'));
});

const getSupplierEscrows = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierPublicKey } = req.params;
  
  if (!supplierPublicKey) {
    throw new ApiError(400, 'Supplier public key is required');
  }

  const escrows = await escrowService.getSupplierEscrows(supplierPublicKey as string);
  return res.status(200).json(new ApiResponse(200, escrows, 'Supplier escrows retrieved'));
});

const getBuyerEscrows = AsyncHandler(async (req: Request, res: Response) => {
  const { buyerPublicKey } = req.params;
  
  if (!buyerPublicKey) {
    throw new ApiError(400, 'Donor public key is required');
  }

  const escrows = await escrowService.getBuyerEscrows(buyerPublicKey as string);
  return res.status(200).json(new ApiResponse(200, escrows, 'Donor escrows retrieved'));
});

const getVotes = AsyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  if (!taskId) {
    throw new ApiError(400, 'Task ID is required');
  }

  const votes = await escrowService.getVotes(taskId as string);
  return res.status(200).json(new ApiResponse(200, votes, 'Votes retrieved'));
});

const getVoterStats = AsyncHandler(async (req: Request, res: Response) => {
  const { voterPublicKey } = req.params;
  
  if (!voterPublicKey) {
    throw new ApiError(400, 'Voter public key is required');
  }

  const stats = await escrowService.getVoterStats(voterPublicKey as string);
  return res.status(200).json(new ApiResponse(200, stats, 'Voter stats retrieved'));
});

const getPlatformStats = AsyncHandler(async (req: Request, res: Response) => {
  const stats = await escrowService.getPlatformStats();
  return res.status(200).json(new ApiResponse(200, stats, 'Platform stats retrieved'));
});

const submitEscrowTx = AsyncHandler(async (req: Request, res: Response) => {
  const { signedXdr } = req.body;
  
  if (!signedXdr) {
    throw new ApiError(400, 'signedXdr is required');
  }

  console.log('[STELLAR] Submitting unified escrow TX...');
  const result = await escrowService.submitTransaction(signedXdr);
  console.log(`[STELLAR] Transaction confirmed: ${result.hash}`);

  return res.status(200).json(new ApiResponse(200, {
    hash: result.hash,
    status: result.status
  }, 'Escrow transaction submitted and verified'));
});

export {
  buildCreateEscrowTx,
  buildSubmitProofTx,
  buildVoteTx,
  submitEscrowTx,
  releaseEscrow,
  disputeEscrow,
  refundEscrow,
  getEscrow,
  getSupplierEscrows,
  getBuyerEscrows,
  getVotes,
  getVoterStats,
  getPlatformStats,
  buildRequestReturnTx,
  buildConfirmReturnTx
};
