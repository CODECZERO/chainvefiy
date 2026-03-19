import { Router } from 'express';
import { getOrdersByBuyer, getOrdersBySupplier, getOrder } from '../controler/order.controller.js';

const router = Router();
router.get('/buyer/:buyerId', getOrdersByBuyer);
router.get('/supplier/:supplierId', getOrdersBySupplier);
router.get('/:id', getOrder);
export default router;
