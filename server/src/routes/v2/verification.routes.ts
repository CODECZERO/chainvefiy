import { Router } from 'express';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import { getVerificationStatus } from '../../controler/v2/verification.controller.js';

const router = Router();

// GET /api/v2/verification/status?productId=...
router.get('/status', verifyJWT, getVerificationStatus);

export default router;
