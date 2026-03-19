import { Router } from 'express';
import {
  initialize,
  mint,
  revoke,
  getBadges,
  verifyBadge,
  badgeCount,
  totalBadges,
  getTopReapers
} from '../../controler/contracts/seller-badge.controller.js';

const router = Router();

// Admin endpoints
router.post('/initialize', initialize);
router.post('/mint', mint);
router.post('/revoke', revoke);

// Query endpoints
router.get('/reaper/:reaperAddress', getBadges);
router.get('/verify/:reaperAddress/:missionId', verifyBadge);
router.get('/count/:reaperAddress', badgeCount);
router.get('/total', totalBadges);
router.get('/leaderboard', getTopReapers);

export default router;
