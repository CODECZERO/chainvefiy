// Renamed: Donations → Orders
import { Request, Response } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';
import { prisma } from '../lib/prisma.js';
import logger from '../util/logger.js';
import { ImgFormater } from '../util/ipfs.uitl.js';

// GET all orders for a buyer
const getOrdersByBuyer = AsyncHandler(async (req: Request, res: Response) => {
  const { buyerId } = req.params;
  if (!buyerId) throw new ApiError(400, 'buyerId required');

  const orders = await prisma.order.findMany({
    where: { buyerId: buyerId as string },
    include: {
      product: { select: { title: true, priceInr: true, proofMediaUrls: true, supplier: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedOrders = await Promise.all(orders.map(async (o: any) => ({
    ...o,
    product: o.product ? {
      ...o.product,
      proofMediaUrls: await Promise.all((o.product.proofMediaUrls || []).map((cid: string) => ImgFormater(cid)))
    } : null
  })));

  res.json(new ApiResponse(200, formattedOrders, 'Orders fetched'));
});

// GET all orders for a supplier
const getOrdersBySupplier = AsyncHandler(async (req: Request, res: Response) => {
  const { supplierId } = req.params;
  if (!supplierId) throw new ApiError(400, 'supplierId required');

  const orders = await prisma.order.findMany({
    where: { product: { supplierId: supplierId as string } },
    include: {
      buyer: { select: { email: true } },
      product: { select: { title: true, proofMediaUrls: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedOrders = await Promise.all(orders.map(async (o: any) => ({
    ...o,
    product: o.product ? {
      ...o.product,
      proofMediaUrls: await Promise.all((o.product.proofMediaUrls || []).map((cid: string) => ImgFormater(cid)))
    } : null
  })));

  res.json(new ApiResponse(200, formattedOrders, 'Supplier orders fetched'));
});

// GET single order
const getOrder = AsyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: {
      product: { include: { supplier: true } },
      buyer: { select: { email: true, stellarWallet: true } },
    },
  });

  if (!order) throw new ApiError(404, 'Order not found');

  const formattedOrder = {
    ...order,
    product: order.product ? {
      ...order.product,
      proofMediaUrls: await Promise.all((order.product.proofMediaUrls || []).map((cid: string) => ImgFormater(cid)))
    } : null
  };

  res.json(new ApiResponse(200, formattedOrder, 'Order fetched'));
});

export { getOrdersByBuyer, getOrdersBySupplier, getOrder };
