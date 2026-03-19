import { Router } from 'express';
import {
  initialize,
  addMinter,
  removeMinter,
  mint,
  burn,
  transfer,
  approve,
  transferFrom,
  stake,
  unstake,
  claimRewards,
  lock,
  unlock,
  balance,
  staked,
  totalSupply,
  locked,
  pendingRewards,
  allowance
} from '../../controler/contracts/trust-token.controller.js';

const router = Router();

// Admin endpoints
router.post('/initialize', initialize);
router.post('/add-minter', addMinter);
router.post('/remove-minter', removeMinter);

// Token operations
router.post('/mint', mint);
router.post('/burn', burn);
router.post('/transfer', transfer);
router.post('/approve', approve);
router.post('/transfer-from', transferFrom);

// Staking operations
router.post('/stake', stake);
router.post('/unstake', unstake);
router.post('/claim-rewards', claimRewards);

// Vesting operations
router.post('/lock', lock);
router.post('/unlock', unlock);

// Query endpoints
router.get('/balance/:address', balance);
router.get('/staked/:address', staked);
router.get('/total-supply', totalSupply);
router.get('/locked/:address', locked);
router.get('/pending-rewards/:address', pendingRewards);
router.get('/allowance/:ownerAddress/:spenderAddress', allowance);

export default router;
