import { Router } from 'express';
import {
  getWalletBalance,
  verifyTransaction,
  getDexQuote,
  getTransactionHistory,
} from '../controler/payment.controler.js';

const router = Router();

router.get('/balance/:walletAddress', getWalletBalance);
router.post('/verify', verifyTransaction);
router.get('/quote', getDexQuote);
router.get('/history/:walletAddress', getTransactionHistory);

export default router;
