import { Router } from 'express';
import { signup, login, logout, getMe, getSupplierOrders } from '../controler/userSupplier.controler.js';
import { verifyJWT } from '../midelware/verify.midelware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyJWT, getMe);
router.get('/supplier/orders', verifyJWT, getSupplierOrders);

export default router;
