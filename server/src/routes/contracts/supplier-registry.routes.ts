import { Router } from 'express';
import {
  initialize,
  register,
  updatePower,
  promote,
  suspend,
  reinstate,
  setDivisionCapacity,
  getReaper,
  getByDivision,
  getAll,
  getPowerHistory,
  totalReapers
} from '../../controler/contracts/supplier-registry.controller.js';

const router = Router();

// Admin endpoints
router.post('/initialize', initialize);
router.post('/promote', promote);
router.post('/suspend', suspend);
router.post('/reinstate', reinstate);
router.post('/set-division-capacity', setDivisionCapacity);

// Reaper operations
router.post('/register', register);
router.post('/update-power', updatePower);

// Query endpoints
router.get('/reaper/:ownerAddress', getReaper);
router.get('/division/:division', getByDivision);
router.get('/all', getAll);
router.get('/power-history/:ownerAddress', getPowerHistory);
router.get('/total', totalReapers);

export default router;
