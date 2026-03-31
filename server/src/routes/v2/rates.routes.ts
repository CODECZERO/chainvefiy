import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { getAllExchangeRates } from '../../controler/v2/rates.controller.js';

const router = Router();

router.get('/all', asyncHandler(getAllExchangeRates));
router.get('/usdc', asyncHandler(getAllExchangeRates)); // Legacy support

export default router;
