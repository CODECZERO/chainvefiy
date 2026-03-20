import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import {
  generateQR,
  browserScan,
  updateScanLocation,
  machineScan,
  getJourney,
  getMapData,
  registerMachine,
  getCertificate,
  resolveQR,
  getMachineData,
  verifyScanToken,
} from '../../controler/v2/qr.controller.js';
import { verifyMachineApiKey } from '../../midelware/machine.midelware.js';

const router = Router();

// ─── Smart resolver — the URL encoded in QR images ───
// Replaces direct /proof/ link as the QR destination
router.get('/resolve/:shortCode', asyncHandler(resolveQR));

// ─── QR generation — JWT required ───
router.post('/generate', verifyJWT, asyncHandler(generateQR));

// ─── Browser scan — no auth, silent fire on page load ───
router.post('/scan', asyncHandler(browserScan));

// ─── GPS update after permission granted ───
router.patch('/scan/:scanId/location', asyncHandler(updateScanLocation));

// ─── Scan token verification (anti-replay) ───
router.post('/scan/:scanId/verify-token', asyncHandler(verifyScanToken));

// ─── Machine scan — API key auth ───
router.post('/machine-scan', verifyMachineApiKey, asyncHandler(machineScan));

// ─── Machine-optimised JSON response (no HTML) ───
router.get('/:shortCode/machine-data', asyncHandler(getMachineData));

// ─── Public journey data — no auth ───
router.get('/:shortCode/journey', asyncHandler(getJourney));
router.get('/:shortCode/map-data', asyncHandler(getMapData));
router.get('/:shortCode/certificate', asyncHandler(getCertificate));

// ─── Machine registration — JWT required ───
router.post('/machines/register', verifyJWT, asyncHandler(registerMachine));

export default router;
