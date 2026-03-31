import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { verifyJWT, optionalJWT } from '../../midelware/verify.midelware.js';
import { placeOrder, getOrderStatus, confirmDelivery, disputeOrder, getBuyerOrders, scanQrHandshake, getPublicProof, dispatchOrder } from '../../controler/v2/orders.controller.js';
import { supplierBuyOrder } from '../../controler/v2/supplier-orders.controller.js';

const router = Router();

// optionalJWT: attaches req.user if token present, passes through for wallet-only
router.post('/', optionalJWT, asyncHandler(placeOrder));
router.get('/my-orders', optionalJWT, asyncHandler(getBuyerOrders));
router.get('/proof/:id', asyncHandler(getPublicProof));
router.get('/:id', optionalJWT, asyncHandler(getOrderStatus));
router.post('/:id/confirm-delivery', optionalJWT, asyncHandler(confirmDelivery));
router.post('/supplier-buy', verifyJWT, asyncHandler(supplierBuyOrder));
router.post('/:id/scan-qr', optionalJWT, asyncHandler(scanQrHandshake));
router.patch('/:id/dispatch', verifyJWT, asyncHandler(dispatchOrder)); // Supplier action
router.post('/:id/dispute', verifyJWT, asyncHandler(disputeOrder)); // strict: requires login

export default router;
