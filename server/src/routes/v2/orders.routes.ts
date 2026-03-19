import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { notifySupplier } from '../../services/whatsapp/whatsapp.service.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import { cacheDel } from '../../lib/redis.js';
import { getUSDCtoINRRate } from '../../util/exchangeRate.util.js';

const router = Router();

// ─── POST place order ───
router.post('/', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const { productId, buyerId, quantity = 1, paymentMethod, sourceCurrency, sourceAmount, escrowTxId, pathPaymentTxId } = req.body;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    res.status(404).json(new ApiResponse(404, null, 'Product not found'));
    return;
  }

  const usdcInr = await getUSDCtoINRRate();
  const priceUsdc = Number(product.priceUsdc) || Number(product.priceInr) / usdcInr;

  const order = await prisma.order.create({
    data: {
      productId,
      buyerId,
      quantity: parseInt(quantity),
      priceInr: product.priceInr,
      priceUsdc,
      paymentMethod,
      sourceCurrency,
      sourceAmount: sourceAmount ? parseFloat(sourceAmount) : null,
      status: 'PAID',
      escrowTxId,
      pathPaymentTxId,
    },
  });


  // Notify supplier
  await notifySupplier(product.supplierId, 'ORDER_RECEIVED', {
    title: product.title,
    quantity,
    amountInr: product.priceInr,
    amountUsdc: priceUsdc.toFixed(4),
    orderId: order.id,
    productId: product.id,
  });

  // Invalidate product cache (order count changed)
  await cacheDel(`product:${productId}`);

  res.status(201).json(new ApiResponse(201, order, 'Order placed'));
}));

// ─── GET order status ───
router.get('/:id', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      product: { select: { title: true, priceInr: true, supplier: { select: { name: true } } } },
      buyer: { select: { email: true } },
    },
  });
  if (!order) {
    res.status(404).json(new ApiResponse(404, null, 'Order not found'));
    return;
  }
  res.json(new ApiResponse(200, order, 'Order fetched'));

}));

// ─── POST confirm delivery (releases USDC) ───
router.post('/:id/confirm-delivery', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const { releaseTxId, rating, review } = req.body;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', releaseTxId, buyerRating: rating, buyerReview: review },
    include: { product: true },
  });

  // Notify supplier payment released
  await notifySupplier(order.product.supplierId, 'PAYMENT_RELEASED', {
    amountUsdc: Number(order.priceUsdc).toFixed(4),
    orderId: order.id,
    productId: order.productId,
  });

  // Update supplier total sales
  await prisma.supplier.update({
    where: { id: order.product.supplierId },
    data: { totalSales: { increment: 1 } },
  });

  res.json(new ApiResponse(200, order, 'Delivery confirmed, payment released'));
}));

// ─── POST dispute order ───
router.post('/:id/dispute', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const { reason } = req.body;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'DISPUTED' },
    include: { product: true },
  });

  // Notify supplier
  await notifySupplier(order.product.supplierId, 'DISPUTE_OPENED', {
    orderId: order.id,
    reason,
    productId: order.productId,
  });

  res.json(new ApiResponse(200, order, 'Dispute opened'));
}));

export default router;
