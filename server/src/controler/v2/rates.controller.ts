import { Response } from 'express';
import { ApiResponse } from '../../util/apiResponse.util.js';
import { getUSDExchangeRates } from '../../util/exchangeRate.util.js';

export const getAllExchangeRates = async (req: any, res: Response) => {
  try {
    const rates = await getUSDExchangeRates();
    
    res.json(new ApiResponse(200, {
      USDC: {
        usd: rates.USDC ?? 1.0,
        inr: rates.USDC_INR ?? 83.33,
      },
      USDT: {
        usd: rates.USDT ?? 1.0,
        inr: rates.USDT_INR ?? 83.33,
      },
      XLM: {
        usd: rates.XLM ?? 0.12,
        inr: rates.XLM_INR ?? 28.6,
      },
      INR_EXCHANGE: rates.USDC_INR ?? 83.33
    }, 'All exchange rates fetched'));

  } catch (error: any) {
    res.status(502).json(new ApiResponse(502, null, 'Error fetching rates from CoinGecko'));
  }
};
