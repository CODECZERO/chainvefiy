import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import { getQuote, initiateUpi, upiWebhook, getPaymentStatus } from '../../controler/v2/payments.controller.js';

const router = Router();

router.post('/quote', asyncHandler(getQuote));
router.post('/upi/initiate', verifyJWT, asyncHandler(initiateUpi));
router.post('/upi/webhook', asyncHandler(upiWebhook));
router.get('/status/:orderId', verifyJWT, asyncHandler(getPaymentStatus));

export default router;
