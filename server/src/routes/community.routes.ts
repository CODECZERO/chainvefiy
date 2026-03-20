import { Router } from 'express';
import { castVote, getQueue, getTopVerifiers } from '../controler/community.controler.js';

const router = Router();
router.post('/vote', castVote);
router.get('/queue', getQueue);
router.get('/leaderboard', getTopVerifiers);

export default router;
