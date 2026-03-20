import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import { placeOrder, getOrderStatus, confirmDelivery, disputeOrder, getBuyerOrders, scanQrHandshake, getPublicProof } from '../../controler/v2/orders.controller.js';

const router = Router();

router.post('/', verifyJWT, asyncHandler(placeOrder));
router.get('/my-orders', verifyJWT, asyncHandler(getBuyerOrders));
router.get('/proof/:id', asyncHandler(getPublicProof));
router.get('/:id', verifyJWT, asyncHandler(getOrderStatus));
router.post('/:id/confirm-delivery', verifyJWT, asyncHandler(confirmDelivery));
router.post('/:id/scan-qr', verifyJWT, asyncHandler(scanQrHandshake));
router.post('/:id/dispute', verifyJWT, asyncHandler(disputeOrder));

export default router;
