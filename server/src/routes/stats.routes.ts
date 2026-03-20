import { Router } from 'express';
import { fetchStats } from '../controler/stats.controler.js';

const router = Router();
router.get('/', fetchStats);

export default router;
