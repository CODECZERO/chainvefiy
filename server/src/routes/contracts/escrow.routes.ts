import { Router } from 'express';
import {
  buildCreateEscrowTx,
  buildSubmitProofTx,
  buildVoteTx,
  buildRequestReturnTx,
  buildConfirmReturnTx,
  releaseEscrow,
  disputeEscrow,
  refundEscrow,
  getEscrow,
  getSupplierEscrows,
  getBuyerEscrows,
  getVotes,
  getVoterStats,
  getPlatformStats
} from '../../controler/contracts/escrow.controller.js';

const router = Router();

// Transaction building endpoints
router.post('/create-escrow/xdr', buildCreateEscrowTx);
router.post('/submit-proof/xdr', buildSubmitProofTx);
router.post('/vote/xdr', buildVoteTx);
router.post('/request-return/xdr', buildRequestReturnTx);
router.post('/confirm-return/xdr', buildConfirmReturnTx);

// Admin execution endpoints
router.post('/release', releaseEscrow);
router.post('/dispute', disputeEscrow);
router.post('/refund', refundEscrow);

// Query endpoints - specific routes first
router.get('/stats/platform', getPlatformStats);
router.get('/supplier/:supplierPublicKey', getSupplierEscrows);
router.get('/buyer/:buyerPublicKey', getBuyerEscrows);
router.get('/voter/:voterPublicKey/stats', getVoterStats);
router.get('/:taskId/votes', getVotes);
router.get('/:taskId', getEscrow);

export default router;
