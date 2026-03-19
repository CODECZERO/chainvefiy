import { Router, Response } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { getUSDExchangeRates } from '../../util/exchangeRate.util.js';

const router = Router();

/**
 * GET current USDC exchange rates for multiple fiat currencies
 * Proxy to CoinGecko via backend utility
 */
router.get('/usdc', asyncHandler(async (req: any, res: Response) => {
  try {
    const rates = await getUSDExchangeRates();
    
    // CoinGecko structure for usd-coin
    // We filter/format it for the frontend
    res.json(new ApiResponse(200, {
      "usd-coin": {
        usd: rates.USDC ?? 1.0,
        inr: rates.USDC_INR ?? 83.33,
        eur: rates.EUR ?? 0.92,
        gbp: rates.GBP ?? 0.79,
        ngn: rates.NGN ?? 1500,
        brl: rates.BRL ?? 5.0,
      }
    }, 'USDC rates fetched via proxy'));

  } catch (error: any) {
    res.status(502).json(new ApiResponse(502, null, 'Error fetching rates from CoinGecko'));
  }
}));

export default router;
