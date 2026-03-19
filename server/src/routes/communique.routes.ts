import { Router } from 'express';
import { createCommunique, getDivisionCommuniques } from '../controler/communique.controler.js';
import { verifyToken } from '../midelware/verify.midelware.js';

const router = Router();

router.post('/', verifyToken, createCommunique);
router.get('/:supplierId', verifyToken, getDivisionCommuniques);

export default router;
