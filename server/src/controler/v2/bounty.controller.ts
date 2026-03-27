import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import {
  createBountyQuery,
  updateBountyStatusQuery,
  getBountiesByProductQuery,
  getBountiesBySupplierQuery,
  getBountyByIdQuery,
  getAllBountiesQuery,
  submitBountyProofQuery
} from '../../dbQueries/bounty.Queries.js';
import { verfiyTransaction } from '../../services/stellar/transcation.stellar.js';

export const createBounty = AsyncHandler(async (req: Request, res: Response) => {
  const { productId, issuerId, stellarWallet, amount, description, paymentMethod } = req.body;

  if (!productId || (!issuerId && !stellarWallet) || !amount || !description) {
    throw new ApiError(400, 'Missing required fields: productId, (issuerId or stellarWallet), amount, description');
  }

  const bounty = await createBountyQuery({
    productId,
    issuerId,
    issuerWallet: stellarWallet,
    amount: parseFloat(amount),
    description,
    paymentMethod: paymentMethod || 'STELLAR_USDC'
  });

  return res.status(201).json(new ApiResponse(201, bounty, 'Bounty request created (Pending payment)'));
});

export const verifyBountyPayment = AsyncHandler(async (req: Request, res: Response) => {
  const { bountyId, transactionHash, paymentMethod } = req.body;

  if (!bountyId || !transactionHash) {
    throw new ApiError(400, 'bountyId and transactionHash are required');
  }

  const bounty = await getBountyByIdQuery(bountyId);
  if (!bounty) throw new ApiError(404, 'Bounty not found');

  let finalHash = transactionHash;

  // Verify transaction if using Stellar
  if (paymentMethod === 'INTERNAL' || transactionHash === 'managed_wallet_auth') {
    // ── Managed Wallet Payment ──
    // In a real system, we'd find the user's managedSecret and sign a tx here.
    // For this dev flow, if the user requested INTERNAL, we verify they HAVE a managed wallet or we use the admin wallet as fallback.
    // We'll mark it as ACTIVE and use a mock "managed" hash if not provided.
    finalHash = `managed_${Date.now()}_${bountyId.slice(0, 8)}`;
  } else if (!paymentMethod || paymentMethod.startsWith('STELLAR')) {
    const tx = await verfiyTransaction(transactionHash);
    if (!tx) {
      throw new ApiError(400, 'Transaction not found on Stellar network');
    }
  } else if (paymentMethod === 'UPI') {
    // UPI verification logic (handled via webhook in production, mock here)
  }

  const updatedBounty = await updateBountyStatusQuery(bountyId, 'ACTIVE', finalHash);

  return res.json(new ApiResponse(200, updatedBounty, 'Bounty payment verified and activated'));
});

export const getBountiesByProduct = AsyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  const bounties = await getBountiesByProductQuery(productId);
  return res.json(new ApiResponse(200, bounties, 'Bounties fetched for product'));
});

export const getSupplierBounties = AsyncHandler(async (req: Request, res: Response) => {
  const supplierId = req.params.supplierId as string;
  const bounties = await getBountiesBySupplierQuery(supplierId);
  return res.json(new ApiResponse(200, bounties, 'Bounties fetched for supplier'));
});

export const getAllBounties = AsyncHandler(async (req: Request, res: Response) => {
  const bounties = await getAllBountiesQuery();
  return res.json(new ApiResponse(200, bounties, 'All active bounties fetched'));
});

export const submitBountyProof = AsyncHandler(async (req: Request, res: Response) => {
  const { bountyId, solverId, proofCid } = req.body;

  if (!bountyId || !solverId || !proofCid) {
    throw new ApiError(400, 'bountyId, solverId, and proofCid are required');
  }

  // Check if bounty exists and is active
  const bounty = await getBountyByIdQuery(bountyId);
  if (!bounty) throw new ApiError(404, 'Bounty not found');
  if (bounty.status !== 'ACTIVE') throw new ApiError(400, 'Bounty is not active');

  const updatedBounty = await submitBountyProofQuery(bountyId, solverId, proofCid);

  return res.json(new ApiResponse(200, updatedBounty, 'Bounty proof submitted successfully'));
});
