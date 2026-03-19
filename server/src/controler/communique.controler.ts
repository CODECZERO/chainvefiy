import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { ApiError } from '../util/apiError.util.js';
import { prisma } from '../lib/prisma.js';

// Communiques → Supplier Announcements (stored in PostgreSQL)
const createCommunique = AsyncHandler(async (req: Request, res: Response) => {
  const { title, content, type, supplierId } = req.body;
  if (!title || !content || !supplierId) throw new ApiError(400, 'title, content, supplierId required');

  // Store as a notification broadcast to all buyers who ordered from this supplier
  const orders = await prisma.order.findMany({
    where: { product: { supplierId } },
    select: { buyerId: true },
    distinct: ['buyerId'],
  });

  await prisma.notification.createMany({
    data: orders.map((o: { buyerId: string }) => ({
      userId: o.buyerId,
      type: 'PRODUCT_VERIFIED' as any,
      title,
      body: content,
      referenceId: supplierId as string,
    })),
    skipDuplicates: true,
  });

  return res.status(201).json(new ApiResponse(201, { title, supplierId, sentTo: orders.length }, 'Announcement sent'));
});

const getDivisionCommuniques = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierId } = req.params;
  const notifications = await prisma.notification.findMany({
    where: { referenceId: supplierId as string },

    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return res.json(new ApiResponse(200, notifications, 'Announcements fetched'));
});

export { createCommunique, getDivisionCommuniques };
