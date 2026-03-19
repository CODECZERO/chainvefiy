import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { escrowService } from '../../services/stellar/escrow.service.js';

// Build transaction XDR endpoints
const buildCreateEscrowTx = AsyncHandler(async (req: Request, res: Response) => {
  const { donorPublicKey, ngoPublicKey, totalAmount, lockedAmount, taskId, deadline } = req.body;
  
  if (!donorPublicKey || !ngoPublicKey || !totalAmount || !lockedAmount || !taskId) {
    throw new ApiError(400, 'Missing required fields');
  }

  const xdr = await escrowService.buildCreateEscrowTx(
    donorPublicKey,
    ngoPublicKey,
    totalAmount,
    lockedAmount,
    taskId,
    deadline || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  );

  return res.status(200).json(new ApiResponse(200, { xdr }, 'Escrow creation transaction built'));
});

const buildSubmitProofTx = AsyncHandler(async (req: Request, res: Response) => {
  const { ngoPublicKey, taskId, proofCid } = req.body;
  
  if (!ngoPublicKey || !taskId || !proofCid) {
    throw new ApiError(400, 'Missing required fields');
  }

  const xdr = await escrowService.buildSubmitProofTx(ngoPublicKey, taskId, proofCid);
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

const getNgoEscrows = AsyncHandler(async (req: Request, res: Response) => {
  const { ngoPublicKey } = req.params;
  
  if (!ngoPublicKey) {
    throw new ApiError(400, 'NGO public key is required');
  }

  const escrows = await escrowService.getNgoEscrows(ngoPublicKey as string);
  return res.status(200).json(new ApiResponse(200, escrows, 'NGO escrows retrieved'));
});

const getDonorEscrows = AsyncHandler(async (req: Request, res: Response) => {
  const { donorPublicKey } = req.params;
  
  if (!donorPublicKey) {
    throw new ApiError(400, 'Donor public key is required');
  }

  const escrows = await escrowService.getDonorEscrows(donorPublicKey as string);
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

export {
  buildCreateEscrowTx,
  buildSubmitProofTx,
  buildVoteTx,
  releaseEscrow,
  disputeEscrow,
  refundEscrow,
  getEscrow,
  getNgoEscrows,
  getDonorEscrows,
  getVotes,
  getVoterStats,
  getPlatformStats
};
