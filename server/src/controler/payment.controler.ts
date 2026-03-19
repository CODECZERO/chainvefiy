import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { prisma } from '../lib/prisma.js';
import {
  getBalance,
  sendPaymentToWallet,
  verfiyTransaction,
} from '../services/stellar/transcation.stellar.js';
import logger from '../util/logger.js';

// GET wallet balance
const getWalletBalance = AsyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  if (!walletAddress) throw new ApiError(400, 'walletAddress required');

  try {
    const balance = await getBalance(walletAddress as string);
    res.json(new ApiResponse(200, balance, 'Balance fetched'));
  } catch (e: any) {
    throw new ApiError(400, e.message || 'Failed to fetch balance');
  }
});

// POST verify a Stellar transaction
const verifyTransaction = AsyncHandler(async (req: Request, res: Response) => {
  const { transactionHash } = req.body;
  if (!transactionHash) throw new ApiError(400, 'transactionHash required');

  try {
    const result = await verfiyTransaction(transactionHash);
    res.json(new ApiResponse(200, result, 'Transaction verified'));
  } catch (e: any) {
    throw new ApiError(400, e.message || 'Transaction not found');
  }
});

// GET DEX quote (path payment)
const getDexQuote = AsyncHandler(async (req: Request, res: Response) => {
  const { sourceCurrency, targetUsdcAmount } = req.query;

  const rates: Record<string, number> = {
    XLM: 0.12, USDC: 1.0, BTC: 65000, ETH: 3200, INR: 0.012,
  };

  const currency = String(sourceCurrency || 'XLM').toUpperCase();
  const rate = rates[currency];
  if (!rate) throw new ApiError(400, `Unsupported currency: ${currency}`);

  const usdc = parseFloat(String(targetUsdcAmount || 1));
  const sourceAmount = usdc / rate;

  res.json(new ApiResponse(200, {
    sourceCurrency: currency,
    sourceAmount: sourceAmount.toFixed(7),
    targetUsdc: usdc.toFixed(7),
    rate,
  }, 'Quote fetched'));
});

// GET transaction history for a wallet
const getTransactionHistory = AsyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.params;

  // Fetch from our DB first (faster than Stellar)
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { buyer: { stellarWallet: walletAddress as string } },
        { product: { supplier: { stellarWallet: walletAddress as string } } },
      ],
    },
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json(new ApiResponse(200, orders, 'Transaction history fetched'));
});

export { getWalletBalance, verifyTransaction, getDexQuote, getTransactionHistory };
