import { Router } from 'express';
import { getUserProfile, getWalletProfile } from '../controler/userProfile.controler.js';

const router = Router();
router.get('/:id', getUserProfile);
router.get('/wallet/:walletAddr', getWalletProfile);
export default router;
