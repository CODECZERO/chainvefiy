import { Request, Response } from 'express';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { ApiError } from '../../util/apiError.util.js';
import { prisma } from '../../lib/prisma.js';
import { getUSDExchangeRates, getUSDCtoINRRate } from '../../util/exchangeRate.util.js';

export const getQuote = async (req: any, res: Response) => {
  const { sourceCurrency, targetUsdcAmount } = req.body;
  if (!sourceCurrency || !targetUsdcAmount) throw new ApiError(400, 'sourceCurrency and targetUsdcAmount required');

  const rates = await getUSDExchangeRates();
  const src = String(sourceCurrency).toUpperCase();
  let rate = rates[src];
  if (!rate && src === 'INR') {
    const usdcInr = await getUSDCtoINRRate();
    rate = 1 / usdcInr;
  }
  if (!rate) throw new ApiError(400, `Unsupported currency: ${sourceCurrency}`);

  const sourceAmount = parseFloat(targetUsdcAmount) / rate;

  res.json(new ApiResponse(200, {
    sourceCurrency: src,
    sourceAmount: sourceAmount.toFixed(7),
    targetUsdc: parseFloat(targetUsdcAmount).toFixed(7),
    exchangeRate: rate,
    fee: (parseFloat(targetUsdcAmount) * 0.003).toFixed(7),
    network: 'stellar-testnet',
    estimatedTime: '< 5 seconds',
  }, 'Quote fetched'));
};

export const initiateUpi = async (req: any, res: Response) => {
  const { amountInr, productId } = req.body || {};
  if (!amountInr || !productId) throw new ApiError(400, 'amountInr and productId required');

  const razorpayOrderId = `order_mock_${Math.random().toString(36).slice(2)}`;
  const amount = Math.round(Number(amountInr) * 100);

  res.json(new ApiResponse(200, { razorpayOrderId, amount, key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key' }, 'UPI initiated'));
};

export const upiWebhook = async (req: Request, res: Response) => {
  res.json(new ApiResponse(200, { received: true }, 'UPI webhook received'));
};

export const getPaymentStatus = async (req: any, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    select: { id: true, status: true, priceUsdc: true, escrowTxId: true, releaseTxId: true, paymentMethod: true },
  });
  if (!order) throw new ApiError(404, 'Order not found');
  res.json(new ApiResponse(200, order, 'Payment status fetched'));
};
