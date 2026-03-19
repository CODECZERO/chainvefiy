import { Router } from 'express';
import { get, listByRecipient, count, buildSendTx } from '../../controler/contracts/notifications.controller.js';

const router = Router();

router.get('/count', count);
router.get('/recipient/:recipientPublicKey', listByRecipient);
router.get('/:id', get);
router.post('/send/xdr', buildSendTx);

export default router;
