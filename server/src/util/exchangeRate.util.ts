// Cache for exchange rate to avoid too many API calls
let cachedRates: Record<string, number> = {};
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache

/**
 * Get current exchange rates relative to USD
 * Uses CoinGecko API with caching
 */
export async function getUSDExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();

  // Return cached rates if still valid
  if (Object.keys(cachedRates).length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // Fetch from CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar,bitcoin,ethereum,usd-coin&vs_currencies=usd,inr',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );


    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const newRates: Record<string, number> = {
      USDC: data['usd-coin']?.usd || 1.0,
      USDC_INR: data['usd-coin']?.inr || 83.33,
      XLM: data.stellar?.usd || 0.12,
      BTC: data.bitcoin?.usd || 65000,
      ETH: data.ethereum?.usd || 3200,
      INR: 1 / (data.stellar?.inr / data.stellar?.usd || 83.33), // 1 INR in USD
      XLM_INR: data.stellar?.inr || 28.6,
    };

    cachedRates = newRates;
    lastFetchTime = now;
    console.log('Exchange rates updated');
    return cachedRates;
  } catch (error: any) {
    console.error('❌ Error fetching exchange rates:', error.message);
    // Return cached if available, or default mocks
    if (Object.keys(cachedRates).length > 0) return cachedRates;
    
    return {
      USDC: 1.0,
      USDC_INR: 83.33,
      XLM: 0.12,
      BTC: 65000,
      ETH: 3200,
      INR: 0.012,
      XLM_INR: 28.6,
    };
  }
}

/**
 * Get current USDC to INR exchange rate
 */
export async function getUSDCtoINRRate(): Promise<number> {
  const rates = await getUSDExchangeRates();
  return rates.USDC_INR ?? 83.33;
}

/**
 * Convert INR amount to USDC (approx)
 */
export async function convertINRtoUSDC(inrAmount: number): Promise<number> {
  const usdcInr = await getUSDCtoINRRate();
  return inrAmount / usdcInr;
}

/**
 * Get current XLM to INR exchange rate
 */
export async function getXLMtoINRRate(): Promise<number> {
  const rates = await getUSDExchangeRates();
  return rates.XLM_INR ?? 28.6;
}


/**
 * Convert XLM amount to INR
 */
export async function convertXLMtoINR(xlmAmount: number): Promise<number> {
  const rate = await getXLMtoINRRate();
  return Math.round(xlmAmount * rate);
}

/**
 * Convert INR amount to XLM
 */
export async function convertINRtoXLM(inrAmount: number): Promise<number> {
  const rate = await getXLMtoINRRate();
  return inrAmount / rate;
}
