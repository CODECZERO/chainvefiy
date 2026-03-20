import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { notifySupplier } from '../../services/whatsapp/whatsapp.service.js';
import { cacheDel } from '../../lib/redis.js';
import { getUSDCtoINRRate } from '../../util/exchangeRate.util.js';
import jwt from 'jsonwebtoken';
import { uploadOnIpfs } from '../../services/ipfs(pinata)/ipfs.services.js';

export const placeOrder = async (req: any, res: Response) => {
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
      quantity: parseInt(quantity as string),
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

  const qrSecret = process.env.QR_SECRET || 'chainverify_qr_secret_fallback';
  const qrBuyerToken = jwt.sign({ orderId: order.id, role: 'BUYER' }, qrSecret);
  const qrSupplierToken = jwt.sign({ orderId: order.id, role: 'SUPPLIER' }, qrSecret);

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { qrBuyerToken, qrSupplierToken }
  });

  await notifySupplier(product.supplierId, 'ORDER_RECEIVED', {
    title: product.title,
    quantity,
    amountInr: product.priceInr,
    amountUsdc: priceUsdc.toFixed(4),
    orderId: order.id,
    productId: product.id,
  });

  await cacheDel(`product:${productId}`);

  res.status(201).json(new ApiResponse(201, updatedOrder, 'Order placed'));
};

export const getBuyerOrders = async (req: any, res: Response) => {
  const buyerId = req.user?.id || req.query.buyerId;
  if (!buyerId) return res.status(401).json(new ApiResponse(401, null, 'Unauthorized or missing buyerId'));

  const orders = await prisma.order.findMany({
    where: { buyerId: String(buyerId) },
    include: {
      product: { include: { supplier: { select: { name: true, location: true, trustScore: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(new ApiResponse(200, orders, 'Orders fetched successfully'));
};

export const getOrderStatus = async (req: any, res: Response) => {
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
};

export const confirmDelivery = async (req: any, res: Response) => {
  const { releaseTxId, rating, review } = req.body;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', releaseTxId, buyerRating: rating, buyerReview: review },
    include: { product: true },
  });

  await notifySupplier(order.product.supplierId, 'PAYMENT_RELEASED', {
    amountUsdc: Number(order.priceUsdc).toFixed(4),
    orderId: order.id,
    productId: order.productId,
  });

  await prisma.supplier.update({
    where: { id: order.product.supplierId },
    data: { totalSales: { increment: 1 } },
  });

  res.json(new ApiResponse(200, order, 'Delivery confirmed, payment released'));
};

export const disputeOrder = async (req: any, res: Response) => {
  const { reason } = req.body;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'DISPUTED' },
    include: { product: true },
  });

  await notifySupplier(order.product.supplierId, 'DISPUTE_OPENED', {
    orderId: order.id,
    reason,
    productId: order.productId,
  });

  res.json(new ApiResponse(200, order, 'Dispute opened'));
};

export const scanQrHandshake = async (req: Request, res: Response) => {
  const { token, roleScanned } = req.body;
  const orderId = req.params.id;

  const qrSecret = process.env.QR_SECRET || 'chainverify_qr_secret_fallback';
  try {
    const payload = jwt.verify(token, qrSecret) as { orderId: string, role: string };
    if (payload.orderId !== orderId) throw new Error("Order ID mismatch");
    if (payload.role !== roleScanned) throw new Error("Role mismatch");
    
    const order = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: { product: { include: { supplier: true } }, buyer: true }
    });
    
    if (!order) return res.status(404).json(new ApiResponse(404, null, 'Order not found'));

    if (roleScanned === 'BUYER') {
      await prisma.order.update({ where: { id: orderId }, data: { qrBuyerScannedAt: new Date() } });
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { qrSupplierScannedAt: new Date() } });
    }

    if (order.deliveryCertCid) {
        return res.json(new ApiResponse(200, { cid: order.deliveryCertCid }, 'Delivery already confirmed.'));
    }

    const certData = {
        orderId: order.id,
        productId: order.productId,
        buyerId: order.buyerId,
        supplierName: order.product.supplier.name,
        deliveredAt: new Date().toISOString(),
        verifiedVia: 'Dual-JWT QR Handshake'
    };

    const ipfsRes = await uploadOnIpfs(certData);
    if (!ipfsRes.success || !ipfsRes.cid) throw new Error('Failed to upload proof to IPFS');
    const cid = ipfsRes.cid;

    const stellarAnchorTxId = `0xlm_anchor_${cid.substring(0, 10)}`; 

    const updatedOrder = await prisma.order.update({
         where: { id: orderId },
         data: {
             status: 'DELIVERED',
             deliveryCertCid: cid,
             deliveryCertTxId: stellarAnchorTxId,
             deliveredAt: new Date()
         }
    });

    await notifySupplier(order.product.supplierId, 'ORDER_RECEIVED', {
       title: order.product.title,
       quantity: order.quantity,
       amountInr: order.priceInr,
       amountUsdc: Number(order.priceUsdc).toFixed(4),
       orderId: order.id,
       productId: order.product.id
    });

    return res.json(new ApiResponse(200, { cert: cid, order: updatedOrder }, 'QR Scan successful. Delivery verified!'));
  } catch (err: any) {
    return res.status(400).json(new ApiResponse(400, null, `Invalid Handshake: ${err.message}`));
  }
};

export const getPublicProof = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { product: { include: { supplier: true } } }
  });
  if (!order || !order.deliveryCertCid) return res.status(404).json(new ApiResponse(404, null, 'Public proof not found'));
  res.json(new ApiResponse(200, {
    orderId: order.id,
    productTitle: order.product.title,
    supplierName: order.product.supplier.name,
    deliveredAt: order.deliveredAt,
    deliveryCertCid: order.deliveryCertCid,
    deliveryCertTxId: order.deliveryCertTxId,
    status: order.status
  }, 'Proof fetched'));
};
