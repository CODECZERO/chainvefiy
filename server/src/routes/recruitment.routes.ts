import { Router } from 'express';
import { joinDivision, getMembers } from '../controler/recruitment.controler.js';

const router = Router();

router.post('/join', joinDivision);
router.get('/:supplierId/members', getMembers);

export default router;
