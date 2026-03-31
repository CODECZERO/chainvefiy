import { Router } from 'express';
import { getBuyerProfile, updateBuyerProfile } from '../../controler/v2/buyer.controller.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';

const router = Router();

router.get('/', getBuyerProfile);
router.put('/', updateBuyerProfile);

export default router;
