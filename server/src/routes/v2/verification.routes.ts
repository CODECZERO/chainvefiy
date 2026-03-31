import { Router } from 'express';
import { verifyJWT, optionalJWT } from '../../midelware/verify.midelware.js';
import { getVerificationStatus } from '../../controler/v2/verification.controller.js';

const router = Router();

// GET /api/v2/verification/status?productId=...
router.get('/status', optionalJWT, getVerificationStatus);

export default router;
