import { Request, Response } from 'express';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { prisma } from '../../lib/prisma.js';

export const getNotifications = async (req: any, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(new ApiResponse(200, notifications, 'Notifications fetched'));
};

export const markAllAsRead = async (req: any, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json(new ApiResponse(200, null, 'All notifications marked as read'));
};

export const markOneAsRead = async (req: any, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json(new ApiResponse(200, null, 'Notification marked as read'));
};

export const getUnreadCount = async (req: any, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  res.json(new ApiResponse(200, { count }, 'Unread count fetched'));
};
