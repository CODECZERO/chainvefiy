import { Router } from 'express';
import {
  initialize,
  setBadgeContract,
  setTokenContract,
  registerMission,
  advanceStatus,
  sealProof,
  failMission,
  getMission,
  getProof,
  getCounter,
  getMissionsByCaptain,
  getValidators
} from '../../controler/contracts/product-registry.controller.js';

const router = Router();

// Admin endpoints
router.post('/initialize', initialize);
router.post('/set-badge-contract', setBadgeContract);
router.post('/set-token-contract', setTokenContract);

// Mission lifecycle endpoints
router.post('/register', registerMission);
router.post('/advance-status', advanceStatus);
router.post('/seal-proof', sealProof);
router.post('/fail', failMission);

// Query endpoints
router.get('/mission/:missionId', getMission);
router.get('/mission/:missionId/proof', getProof);
router.get('/counter', getCounter);
router.get('/captain/:captainAddress', getMissionsByCaptain);
router.get('/mission/:missionId/validators', getValidators);

export default router;
