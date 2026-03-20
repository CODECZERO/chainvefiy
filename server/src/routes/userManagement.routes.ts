import { Router } from 'express';
import { getAllUsers, getUserById, updateUserRole } from '../controler/userManagement.controler.js';

const router = Router();
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/role', updateUserRole);
export default router;
