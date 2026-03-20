import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { getSupplier, getSupplierProducts, registerSupplier, flagSupplier, getSupplierAnalytics } from '../../controler/v2/suppliers.controller.js';

const router = Router();

router.get('/:id', asyncHandler(getSupplier));
router.get('/:id/products', asyncHandler(getSupplierProducts));
router.get('/:id/analytics', asyncHandler(getSupplierAnalytics));
router.post('/', asyncHandler(registerSupplier));
router.post('/:id/flag', asyncHandler(flagSupplier));

export default router;
