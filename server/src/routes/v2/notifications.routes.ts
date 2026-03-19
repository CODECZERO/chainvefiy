import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { prisma } from '../../lib/prisma.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';

const router = Router();

// GET all notifications for logged-in user
router.get('/', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(new ApiResponse(200, notifications, 'Notifications fetched'));
}));

// PATCH mark all as read
router.patch('/read-all', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json(new ApiResponse(200, null, 'All notifications marked as read'));
}));

// PATCH mark one as read
router.patch('/:id/read', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json(new ApiResponse(200, null, 'Notification marked as read'));
}));

// GET unread count
router.get('/unread-count', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  res.json(new ApiResponse(200, { count }, 'Unread count fetched'));
}));

export default router;
