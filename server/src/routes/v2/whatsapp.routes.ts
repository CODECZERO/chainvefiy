import { Router } from 'express';
import { handleIncoming } from '../../services/whatsapp/whatsapp.service.js';
import { getWhatsappStatus } from '../../controler/v2/whatsapp.controller.js';

const router = Router();

router.post('/webhook', handleIncoming);
router.get('/status', getWhatsappStatus);

export default router;
