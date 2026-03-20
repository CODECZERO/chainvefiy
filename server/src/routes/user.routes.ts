import { Router } from 'express';
import { signup, login, logout, getMe } from '../controler/userSupplier.controler.js';
import { verifyJWT } from '../midelware/verify.midelware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyJWT, getMe);

export default router;
