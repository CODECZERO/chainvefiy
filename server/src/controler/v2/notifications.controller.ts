import { Request, Response } from 'express';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { prisma } from '../../lib/prisma.js';

export const getNotifications = async (req: any, res: Response) => {
  let userId = req.user?.id;
  const stellarWallet = req.query.stellarWallet as string;

  if (!userId && stellarWallet) {
    const user = await prisma.user.findUnique({ where: { stellarWallet } });
    if (user) userId = user.id;
  }

  if (!userId) return res.status(401).json(new ApiResponse(401, null, 'Unauthorized'));

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return res.json(new ApiResponse(200, notifications, 'Notifications fetched'));
};

export const markAllAsRead = async (req: any, res: Response) => {
  let userId = req.user?.id;
  const { stellarWallet } = req.body;

  if (!userId && stellarWallet) {
    const user = await prisma.user.findUnique({ where: { stellarWallet } });
    if (user) userId = user.id;
  }

  if (!userId) return res.status(401).json(new ApiResponse(401, null, 'Unauthorized'));

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return res.json(new ApiResponse(200, null, 'All notifications marked as read'));
};

export const markOneAsRead = async (req: any, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  return res.json(new ApiResponse(200, null, 'Notification marked as read'));
};

export const getUnreadCount = async (req: any, res: Response) => {
  let userId = req.user?.id;
  const stellarWallet = req.query.stellarWallet as string;

  if (!userId && stellarWallet) {
    const user = await prisma.user.findUnique({ where: { stellarWallet } });
    if (user) userId = user.id;
  }

  if (!userId) return res.status(401).json(new ApiResponse(401, { count: 0 }, 'Unauthorized (fallback to 0)'));

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return res.json(new ApiResponse(200, { count }, 'Unread count fetched'));
};
