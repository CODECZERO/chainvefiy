import { Router } from 'express';
import { getPreviousTransaction, createTransactionRecord } from '../controler/expense.controler.js';
import { verifyToken } from '../midelware/verify.midelware.js';

const router = Router();

// GET /api/expenses/prev-txn/:postId - Get previous transaction for a post
router.get('/prev-txn/:postId', verifyToken, getPreviousTransaction);

// POST /api/expenses/create - Create new transaction record (auth required)
router.post('/create', verifyToken, createTransactionRecord);

export default router;
