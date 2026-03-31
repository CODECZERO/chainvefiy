import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { escrowService } from '../../services/stellar/escrow.service.js';
import { getUSDCtoINRRate } from '../../util/exchangeRate.util.js';
import { Keypair } from '@stellar/stellar-sdk';
import { notifySupplier } from '../../services/whatsapp/whatsapp.service.js';
import { buildCacheKey, cacheDel } from '../../lib/redis.js';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

export const supplierBuyOrder = async (req: any, res: Response) => {
  const { productId, quantity = 1 } = req.body;
  const buyerId = req.user?.id;

  if (!buyerId || req.user?.role !== 'SUPPLIER') {
    return res.status(403).json(new ApiResponse(403, null, 'Only suppliers can use this endpoint'));
  }

  // Fetch the buying supplier's info and managed secret
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    include: { supplierProfile: true }
  });

  if (!buyer || !buyer.managedSecret || !buyer.stellarWallet) {
    return res.status(400).json(new ApiResponse(400, null, 'Backend wallet (managedSecret) not configured for this account. Create a new supplier account to use this feature.'));
  }

  const product = await prisma.product.findUnique({ 
    where: { id: productId },
    include: { supplier: true }
  });
  
  if (!product) {
    return res.status(404).json(new ApiResponse(404, null, 'Product not found'));
  }
  
  if (!product.supplier.stellarWallet) {
    return res.status(400).json(new ApiResponse(400, null, 'Product supplier has no configured stellar wallet'));
  }

  const usdcInr = await getUSDCtoINRRate();
  const priceUsdc = Number(product.priceUsdc) || Number(product.priceInr) / usdcInr;
  const totalAmountUsdc = priceUsdc * quantity;
  const lockedAmountUsdc = totalAmountUsdc / 2; // 50% locked in escrow

  const orderId = crypto.randomUUID();
  const deadline = Math.floor(Date.now() / 1000) + (3600 * 24 * 7); // 7 days

  try {
    // 1. Build the Escrow TX
    const { xdr, classicFallback } = await escrowService.buildCreateEscrowTx(
      buyer.stellarWallet,
      product.supplier.stellarWallet,
      totalAmountUsdc,
      lockedAmountUsdc,
      orderId,
      deadline,
      'USDC'
    );

    // 2. Sign transaction with backend-managed secret
    const buyerKeypair = Keypair.fromSecret(buyer.managedSecret);
    const { TransactionBuilder, Networks } = await import('@stellar/stellar-sdk');
    
    // Attempt standard classic transaction (more reliable fallback)
    const txToSign = xdr; 
    const tx = TransactionBuilder.fromXDR(txToSign, Networks.TESTNET);
    tx.sign(buyerKeypair);
    
    const signedXdr = tx.toEnvelope().toXDR('base64');

    // 3. Submit transaction
    const { hash: escrowTxId } = await escrowService.submitTransaction(signedXdr);

    // 4. Create Order in database
    const orderData: any = {
      id: orderId,
      productId,
      buyerId: String(buyerId),
      quantity: parseInt(quantity as string),
      priceInr: product.priceInr,
      priceUsdc,
      paymentMethod: 'INTERNAL',
      sourceCurrency: 'USDC',
      status: 'PAID',
      escrowTxId,
      // For backend buys, default shipping to supplier location (or internal facility)
      shippingFullName: buyer.supplierProfile?.name,
      shippingPhone: buyer.supplierProfile?.whatsappNumber,
      shippingCity: buyer.supplierProfile?.location,
      shippingCountry: 'India'
    };

    const order = await prisma.order.create({ data: orderData });

    // Generate journey QR
    const qrSecret = process.env.QR_SECRET || 'chainverify_qr_secret_fallback';
    const qrBuyerToken = jwt.sign({ orderId: order.id, role: 'BUYER' }, qrSecret);
    const qrSupplierToken = jwt.sign({ orderId: order.id, role: 'SUPPLIER' }, qrSecret);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const buyerJourneyUrl = `${appUrl}/order/${order.id}/journey?token=${qrBuyerToken}`;
    const qrBuyerDataUrl = await QRCode.toDataURL(buyerJourneyUrl, { 
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    const finalOrder = await prisma.order.update({
      where: { id: order.id },
      data: { qrBuyerToken, qrSupplierToken, qrCodeUrl: qrBuyerDataUrl }
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

    return res.status(201).json(new ApiResponse(201, finalOrder, 'Supplier Order placed securely via backend vault!'));
  } catch (err: any) {
    console.error('[SUPPLIER_BUY] Error:', err);
    return res.status(500).json(new ApiResponse(500, null, `Stellar execution failed: ${err.message}`));
  }
};
