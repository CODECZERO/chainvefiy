import { Router } from 'express';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { getProducts, getProduct, createProduct, getProductQRCode, addStageUpdate, voteOnProduct, slashEscrowVotes, getUserTrustTokens } from '../../controler/v2/products.controller.js';

const router = Router();

router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', verifyJWT, asyncHandler(createProduct));
router.get('/tokens/:userId', verifyJWT, asyncHandler(getUserTrustTokens));
router.get('/:id/qr', asyncHandler(getProductQRCode));
router.post('/:id/stage', verifyJWT, asyncHandler(addStageUpdate));
router.post('/:id/vote', verifyJWT, asyncHandler(voteOnProduct));
router.post('/:productId/slash', verifyJWT, asyncHandler(slashEscrowVotes));

export default router;
