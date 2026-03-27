import { Router } from 'express';
import {
  createBounty,
  verifyBountyPayment,
  getBountiesByProduct,
  getSupplierBounties,
  getAllBounties,
  submitBountyProof
} from '../../controler/v2/bounty.controller.js';

const router = Router();

router.get('/', getAllBounties);
router.post('/', createBounty);
router.post('/verify', verifyBountyPayment);
router.get('/product/:productId', getBountiesByProduct);
router.get('/supplier/:supplierId', getSupplierBounties);
router.post('/submit-proof', submitBountyProof);

export default router;
