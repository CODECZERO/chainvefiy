import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { notifySupplier } from '../../services/whatsapp/whatsapp.service.js';
import { cacheDel, buildCacheKey } from '../../lib/redis.js';
import { getUSDCtoINRRate } from '../../util/exchangeRate.util.js';
import jwt from 'jsonwebtoken';
import { uploadOnIpfs } from '../../services/ipfs(pinata)/ipfs.services.js';
import QRCode from 'qrcode';
import { EscrowService } from '../../services/stellar/escrow.service.js';
import logger from '../../util/logger.js';

export const placeOrder = async (req: any, res: Response) => {
  const { 
    id, productId, buyerId, quantity = 1, paymentMethod, sourceCurrency, sourceAmount, 
    escrowTxId, pathPaymentTxId, stellarWallet,
    shippingFullName, shippingPhone, shippingAddress, shippingCity, shippingState, shippingPincode, shippingCountry 
  } = req.body;

  let finalBuyerId = buyerId;

  // If no buyerId provided but wallet is present, find or create the buyer user
  if (!finalBuyerId && stellarWallet) {
    let user = await prisma.user.findUnique({ where: { stellarWallet } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          stellarWallet,
          role: 'BUYER',
        }
      });
    }
    finalBuyerId = user.id;
  }

  if (!finalBuyerId) {
    return res.status(401).json(new ApiResponse(401, null, 'Authentication or wallet connection required'));
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return res.status(404).json(new ApiResponse(404, null, 'Product not found'));
  }

  const usdcInr = await getUSDCtoINRRate();
  const priceUsdc = Number(product.priceUsdc) || Number(product.priceInr) / usdcInr;

  const orderData: any = {
    productId,
    buyerId: String(finalBuyerId),
    quantity: parseInt(quantity as string),
    priceInr: product.priceInr,
    priceUsdc,
    paymentMethod,
    sourceCurrency,
    sourceAmount: sourceAmount ? parseFloat(sourceAmount) : null,
    status: 'PAID',
    escrowTxId,
    pathPaymentTxId,
    shippingFullName,
    shippingPhone,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingPincode,
    shippingCountry
  };

  if (id) {
    orderData.id = id;
  }

  const order = await prisma.order.create({
    data: orderData,
  });

  const qrSecret = process.env.QR_SECRET || 'chainverify_qr_secret_fallback';
  const qrBuyerToken = jwt.sign({ orderId: order.id, role: 'BUYER' }, qrSecret);
  const qrSupplierToken = jwt.sign({ orderId: order.id, role: 'SUPPLIER' }, qrSecret);

  // Generate unique buyer journey QR
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const buyerJourneyUrl = `${appUrl}/order/${order.id}/journey?token=${qrBuyerToken}`;
  const qrBuyerDataUrl = await QRCode.toDataURL(buyerJourneyUrl, { 
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const finalOrder = await (prisma.order as any).update({
    where: { id: order.id },
    data: { qrBuyerToken, qrSupplierToken, qrCodeUrl: qrBuyerDataUrl }
  });

  // Eagerly initiate Living QR Journey record
  await prisma.qRCode.create({
    data: {
      id: order.id, // Use orderId as QR ID for 1:1 mapping
      shortCode: order.id,
      token: qrBuyerToken,
      purpose: 'ORDER_BUYER',
      orderId: order.id,
      productId: product.id,
      supplierId: product.supplierId,
    }
  }).catch(() => {}); // Fail silently if already exists

  await notifySupplier(product.supplierId, 'ORDER_RECEIVED', {
    title: product.title,
    quantity,
    amountInr: product.priceInr,
    amountUsdc: priceUsdc.toFixed(4),
    orderId: order.id,
    productId: product.id,
  });

  await cacheDel(`product:${productId}`);

  return res.status(201).json(new ApiResponse(201, finalOrder, 'Order placed with unique journey QR'));
};

export const getBuyerOrders = async (req: any, res: Response) => {
  const { buyerId, stellarWallet } = req.query;
  const authUserId = req.user?.id;
  
  let finalBuyerId = authUserId || buyerId;

  if (!finalBuyerId && stellarWallet) {
    const user = await prisma.user.findUnique({ where: { stellarWallet: String(stellarWallet) } });
    if (user) finalBuyerId = user.id;
  }

  if (!finalBuyerId) {
    logger.info(`[Orders] getBuyerOrders: No user found for filters, returning empty list`);
    return res.json(new ApiResponse(200, [], 'No orders found for this identity'));
  }

  const orders = await prisma.order.findMany({
    where: { buyerId: String(finalBuyerId) },
    include: {
      product: { include: { supplier: { select: { name: true, location: true, trustScore: true } } } },
      qrCode: true
    },
    orderBy: { createdAt: 'desc' }
  });

  logger.info(`[Orders] Fetched ${orders.length} orders for buyer ${finalBuyerId}`);
  return res.json(new ApiResponse(200, orders, 'Orders fetched successfully'));
};

export const getOrderStatus = async (req: any, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      product: { 
        include: { 
          supplier: { select: { name: true, stellarWallet: true, location: true } },
          stageUpdates: { orderBy: { stageNumber: 'asc' } }
        } 
      },
      buyer: { select: { email: true, stellarWallet: true } },
      qrCode: {
        include: {
          scans: {
            orderBy: { scanNumber: 'asc' },
            select: {
              id: true,
              scanNumber: true,
              resolvedLocation: true,
              serverTimestamp: true,
              scanSource: true,
              scannerRole: true,
              anchoredOnChain: true
            },
            take: 50 // Limit to avoid massive payloads
          }
        }
      }
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
    where: { id: String(req.params.id) },
    include: { product: { include: { supplier: true } } }
  });
  if (!order || !order.deliveryCertCid) return res.status(404).json(new ApiResponse(404, null, 'Public proof not found'));
  return res.json(new ApiResponse(200, {
    orderId: order.id,
    productTitle: order.product.title,
    supplierName: order.product.supplier.name,
    deliveredAt: order.deliveredAt,
    deliveryCertCid: order.deliveryCertCid,
    deliveryCertTxId: order.deliveryCertTxId,
    status: order.status
  }, 'Proof fetched'));
};

export const dispatchOrder = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  
  const order = await prisma.order.findUnique({
    where: { id },
    include: { product: { include: { supplier: true } } }
  });

  if (!order) return res.status(404).json(new ApiResponse(404, null, 'Order not found'));

  // Try to dispatch half payment to supplier vault
  if (order.priceUsdc && order.product.supplier.stellarWallet && order.status === 'PAID') {
    const halfAmount = Number(order.priceUsdc) / 2;
    try {
      const escrowService = new EscrowService();
      const txHash = await escrowService.releaseDispatchPartialPayment(order.product.supplier.stellarWallet, halfAmount);
      console.log(`[STELLAR] Dispatched half payment TX: ${txHash}`);
    } catch (e) {
      console.error("[STELLAR] Failed to release half payment", e);
    }
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { status: 'SHIPPED' }
  });

  let qrCode = await prisma.qRCode.findFirst({
    where: {
      OR: [
        { shortCode: id },
        { orderId: id }
      ]
    }
  });
  if (!qrCode) {
    qrCode = await prisma.qRCode.create({
      data: {
        shortCode: id,
        token: order.qrBuyerToken || `fallback-token-${id}`,
        purpose: 'ORDER_BUYER',
        orderId: id,
        productId: order.productId,
        supplierId: order.product.supplierId,
        firstScannedAt: new Date(),
        lastScannedAt: new Date()
      }
    });
  }

  await prisma.qRScan.create({
    data: {
      qrCodeId: qrCode.id,
      scanSource: 'MACHINE',
      machineEventType: 'DISPATCHED',
      scanNumber: (await prisma.qRScan.count({ where: { qrCodeId: qrCode.id } })) + 1,
      serverTimestamp: new Date(),
      clientTimestamp: new Date(),
      ipCountry: order.shippingCountry || null,
      ipCountryName: null,
      ipCity: order.shippingCity || null,
      resolvedLocation: `Dispatched from ${order.product.supplier.location || 'Seller Facility'}`,
      resolvedLat: null,
      resolvedLng: null
    }
  });

  await cacheDel(buildCacheKey('journey', { shortCode: id }));

  return res.json(new ApiResponse(200, updatedOrder, 'Order marked as dispatched and journey initiated'));
};
