import { Request, Response } from 'express';
import AsyncHandler from '../../util/asyncHandler.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { notificationsService } from '../../services/stellar/notifications.service.js';

const get = AsyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) throw new ApiError(400, 'Notification ID is required');
  const notification = await notificationsService.get(id as string);
  return res.status(200).json(new ApiResponse(200, notification, notification ? 'Notification retrieved' : 'Not found'));
});

const listByRecipient = AsyncHandler(async (req: Request, res: Response) => {
  const { recipientPublicKey } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  if (!recipientPublicKey) throw new ApiError(400, 'Recipient public key is required');
  const list = await notificationsService.listByRecipient(recipientPublicKey as string, limit);
  return res.status(200).json(new ApiResponse(200, list, 'Notifications listed'));
});

const count = AsyncHandler(async (req: Request, res: Response) => {
  const total = await notificationsService.count();
  return res.status(200).json(new ApiResponse(200, { count: total }, 'Count retrieved'));
});

const buildSendTx = AsyncHandler(async (req: Request, res: Response) => {
  const { senderPublicKey, recipientPublicKey, message } = req.body;
  if (!senderPublicKey || !recipientPublicKey || !message) {
    throw new ApiError(400, 'senderPublicKey, recipientPublicKey, and message are required');
  }
  const xdr = await notificationsService.buildSendTx(senderPublicKey, recipientPublicKey, message);
  return res.status(200).json(new ApiResponse(200, { xdr }, 'Send transaction built'));
});

export { get, listByRecipient, count, buildSendTx };
