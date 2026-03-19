import { Router } from 'express';
import { handleIncoming } from '../../services/whatsapp/whatsapp.service.js';

const router = Router();

// Twilio sends POST to this endpoint for every incoming WhatsApp message
router.post('/webhook', handleIncoming);

// Health check for WhatsApp route
router.get('/status', (req, res) => {
  res.json({ status: 'WhatsApp webhook active', number: process.env.TWILIO_WHATSAPP_NUMBER });
});

export default router;
