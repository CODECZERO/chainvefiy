import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { getUSDCExchangeRates } from '../../controler/v2/rates.controller.js';

const router = Router();

router.get('/usdc', asyncHandler(getUSDCExchangeRates));

export default router;
