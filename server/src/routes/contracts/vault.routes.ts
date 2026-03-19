import { Router } from 'express';
import {
  put,
  get,
  getMeta,
  getDeltas,
  bloomCheck,
  has,
  getIndex,
  getStats,
  migrateToCold,
  deleteEntry
} from '../../controler/contracts/vault.controller.js';

const router = Router();

// Write operations
router.post('/put', put);
router.post('/migrate-to-cold', migrateToCold);
router.delete('/delete', deleteEntry);

// Query operations
router.get('/:collection/:id', get);
router.get('/:collection/:id/meta', getMeta);
router.get('/:collection/:id/deltas', getDeltas);
router.get('/:collection/:id/bloom-check', bloomCheck);
router.get('/:collection/:id/has', has);
router.get('/:collection/index', getIndex);
router.get('/stats', getStats);

export default router;
