import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import {
  getBalance,
  sendPaymentToWallet,
  verfiyTransaction,
} from '../services/stellar/transcation.stellar.js';
import { createAccount, DeletAccount } from '../services/stellar/account.stellar.js';
import {
  saveContractWithWallet,
  getLatestData,
} from '../services/stellar/smartContract.handler.stellar.js';
import {
  getTransactionHistory,
  getTransactionOperations,
} from '../services/stellar/transaction.history.stellar.js';

export interface GetBalanceRequest {
  publicKey: string;
}

export interface SendPaymentRequest {
  senderKey: string;
  receiverKey: string;
  amount: number;
  meta: {
    cid: string;
    prevTxn?: string;
  };
}

export interface CreateAccountRequest {
  // No specific request body needed, account creation is automatic
}

export interface DeleteAccountRequest {
  secret: string;
  destination: string;
}

export interface SmartContractRequest {
  privateKey: string;
  reciverKey: string;
  amount: number;
  cid: string;
  prevTxn: string;
  metadata?: string;
}

// Get wallet balance
const getWalletBalance = AsyncHandler(async (req: Request, res: Response) => {
  const { publicKey } = req.params;
  if (!publicKey) throw new ApiError(400, 'Public key is required');

  const balance = await getBalance(publicKey as string);
  return res.status(200).json(new ApiResponse(200, balance, 'Balance retrieved successfully'));
});

// Send payment between wallets
const sendPayment = AsyncHandler(async (req: Request, res: Response) => {
  const paymentData: SendPaymentRequest = req.body;
  if (!paymentData) throw new ApiError(400, 'Payment data is required');

  const result = await sendPaymentToWallet(paymentData);
  if (!result.success) {
    throw new ApiError(500, result.error || 'Payment failed');
  }

  return res.status(200).json(new ApiResponse(200, result, 'Payment sent successfully'));
});

// Verify transaction
const verifyTransaction = AsyncHandler(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  if (!transactionId) throw new ApiError(400, 'Transaction ID is required');

  const transaction = await verfiyTransaction(transactionId as string);
  if (!transaction) throw new ApiError(404, 'Transaction not found');

  return res.status(200).json(new ApiResponse(200, transaction, 'Transaction verified'));
});

// Create new Stellar account
const createStellarAccount = AsyncHandler(async (req: Request, res: Response) => {
  const accountData = await createAccount();
  if (!accountData) throw new ApiError(500, 'Failed to create account');

  return res.status(200).json(new ApiResponse(200, accountData, 'Account created successfully'));
});

// Delete Stellar account
const deleteStellarAccount = AsyncHandler(async (req: Request, res: Response) => {
  const { secret, destination } = req.body as DeleteAccountRequest;
  if (!secret || !destination) throw new ApiError(400, 'Secret and destination are required');

  await DeletAccount(secret, destination);
  return res.status(200).json(new ApiResponse(200, null, 'Account deleted successfully'));
});

// Save data to smart contract
const saveToSmartContract = AsyncHandler(async (req: Request, res: Response) => {
  const contractData: SmartContractRequest = req.body;
  if (!contractData) throw new ApiError(400, 'Contract data is required');

  const result = await saveContractWithWallet(contractData);
  if (!result) throw new ApiError(500, 'Failed to save to smart contract');

  return res.status(200).json(new ApiResponse(200, result, 'Data saved to smart contract'));
});

// Get latest data from smart contract
const getLatestContractData = AsyncHandler(async (req: Request, res: Response) => {
  const { privateKey } = req.body;
  if (!privateKey) throw new ApiError(400, 'Private key is required');

  const data = await getLatestData(privateKey);
  if (!data) throw new ApiError(404, 'No data found');

  return res.status(200).json(new ApiResponse(200, data, 'Latest contract data retrieved'));
});

// Get transaction history for a public key
const STELLAR_ACCOUNT_ID_REGEX = /^G[A-Z2-7]{55}$/;

const getAccountTransactions = AsyncHandler(async (req: Request, res: Response) => {
  const { publicKey } = req.params;
  if (!publicKey) throw new ApiError(400, 'Public key is required');
  if (!STELLAR_ACCOUNT_ID_REGEX.test(publicKey as string)) {
    throw new ApiError(400, 'Invalid account ID: must start with G and contain 56 alphanumeric characters');
  }

  const limit = parseInt(req.query.limit as string) || 20;
  const order = (req.query.order as 'asc' | 'desc') || 'desc';

  const transactions = await getTransactionHistory(publicKey as string, limit, order);
  return res.status(200).json(
    new ApiResponse(200, transactions, `Found ${transactions.length} transactions`)
  );
});

// Get operations for a specific transaction
const getTransactionOps = AsyncHandler(async (req: Request, res: Response) => {
  const { txHash } = req.params;
  if (!txHash) throw new ApiError(400, 'Transaction hash is required');

  const operations = await getTransactionOperations(txHash as string);
  return res.status(200).json(
    new ApiResponse(200, operations, `Found ${operations.length} operations`)
  );
});

export {
  getWalletBalance,
  sendPayment,
  verifyTransaction,
  createStellarAccount,
  deleteStellarAccount,
  saveToSmartContract,
  getLatestContractData,
  getAccountTransactions,
  getTransactionOps,
};
