import { Request, Response } from 'express';

export const getWhatsappStatus = (req: Request, res: Response) => {
  res.json({ status: 'WhatsApp webhook active', number: process.env.TWILIO_WHATSAPP_NUMBER });
};
