import { Router } from 'express';
import {
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
} from '../../controler/contracts/treasury.controller.js';

const router = Router();

// Admin endpoints
router.post('/initialize', initialize);
router.post('/add-signer', addSigner);
router.post('/set-budget', setBudget);

// Treasury operations
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/approve-withdrawal', approveWithdrawal);

// Query endpoints
router.get('/balance/:dividerAddress', getBalance);
router.get('/history/:dividerAddress', getHistory);
router.get('/request/:requestId', getRequest);
router.get('/budget/:divisionAddress', getBudget);

export default router;
