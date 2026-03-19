import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { prisma } from '../../lib/prisma.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';

import { getUSDExchangeRates, getUSDCtoINRRate } from '../../util/exchangeRate.util.js';
 
 const router = Router();
 
 // ─── GET Stellar DEX quote for path payment ───
 // Returns how much of sourceCurrency buyer needs to pay to get targetUsdc
 router.post('/quote', verifyJWT, asyncHandler(async (req: any, res: Response) => {
   const { sourceCurrency, targetUsdcAmount } = req.body;
   if (!sourceCurrency || !targetUsdcAmount) throw new ApiError(400, 'sourceCurrency and targetUsdcAmount required');
 
   const rates = await getUSDExchangeRates();
   const src = String(sourceCurrency).toUpperCase();
   let rate = rates[src];
   if (!rate && src === 'INR') {
     const usdcInr = await getUSDCtoINRRate();
     // source amount is INR; target is USDC
     rate = 1 / usdcInr;
   }
   if (!rate) throw new ApiError(400, `Unsupported currency: ${sourceCurrency}`);

  const sourceAmount = parseFloat(targetUsdcAmount) / rate;

  res.json(new ApiResponse(200, {
    sourceCurrency: src,
    sourceAmount: sourceAmount.toFixed(7),
    targetUsdc: parseFloat(targetUsdcAmount).toFixed(7),
    exchangeRate: rate,
    fee: (parseFloat(targetUsdcAmount) * 0.003).toFixed(7), // 0.3% fee
    network: 'stellar-testnet',
    estimatedTime: '< 5 seconds',
  }, 'Quote fetched'));
}));

// ─── POST UPI initiate (Razorpay placeholder) ───
router.post('/upi/initiate', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const { amountInr, productId } = req.body || {};
  if (!amountInr || !productId) throw new ApiError(400, 'amountInr and productId required');

  // Placeholder implementation: in production integrate Razorpay SDK.
  const razorpayOrderId = `order_mock_${Math.random().toString(36).slice(2)}`;
  const amount = Math.round(Number(amountInr) * 100); // paise

  res.json(new ApiResponse(200, { razorpayOrderId, amount, key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key' }, 'UPI initiated'));
}));

// ─── POST UPI webhook (placeholder) ───
router.post('/upi/webhook', asyncHandler(async (req: Request, res: Response) => {
  // In production: verify signature and mark payment success.
  res.json(new ApiResponse(200, { received: true }, 'UPI webhook received'));
}));

// ─── GET payment status ───
router.get('/status/:orderId', verifyJWT, asyncHandler(async (req: any, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    select: { id: true, status: true, priceUsdc: true, escrowTxId: true, releaseTxId: true, paymentMethod: true },
  });
  if (!order) throw new ApiError(404, 'Order not found');
  res.json(new ApiResponse(200, order, 'Payment status fetched'));
}));


export default router;
