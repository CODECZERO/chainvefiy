let cachedRate: number | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // Cache for 5 minutes

// Standardized fallback rate (matching backend)
const FALLBACK_XLM_INR = 28.6
const FALLBACK_USDC_INR = 83.33

export async function getExchangeRate(): Promise<number> {
  const now = Date.now()

  // Return cached rate if still valid
  if (cachedRate !== null && now - lastFetchTime < CACHE_DURATION) {
    return cachedRate
  }

  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=inr")
    if (!response.ok) throw new Error("API failure")
    const data = await response.json()
    const rate = data.stellar?.inr
    
    if (rate) {
      cachedRate = rate
      lastFetchTime = now
      return rate
    }
    return cachedRate || FALLBACK_XLM_INR
  } catch (error) {
    console.warn("Using fallback XLM/INR rate due to API error:", error)
    return cachedRate || FALLBACK_XLM_INR
  }
}

let cachedAllRates: any = null
let lastAllFetchTime = 0

export async function getAllRates(): Promise<any> {
  const now = Date.now()
  if (cachedAllRates && now - lastAllFetchTime < CACHE_DURATION) {
    return cachedAllRates
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rates/all`)
    if (!response.ok) throw new Error("API failure")
    const data = await response.json()
    
    if (data.success && data.data) {
      cachedAllRates = data.data
      lastAllFetchTime = now
      return cachedAllRates
    }
    return cachedAllRates
  } catch (error) {
    console.warn("Failed to fetch all rates:", error)
    return cachedAllRates
  }
}

export async function getUSDCRates(): Promise<Record<string, number>> {
  const all = await getAllRates()
  return all?.USDC || { usd: 1.0, inr: FALLBACK_USDC_INR }
}

export function convertRsToXlm(amountInRs: number, rate: number): number {
  return amountInRs / rate
}

export function convertXlmToRs(amountInXlm: number, rate: number): number {
  return amountInXlm * rate
}

export async function getUSDCInrRate(): Promise<number> {
  const rates = await getUSDCRates()
  const inr = rates?.inr
  return typeof inr === "number" && Number.isFinite(inr) && inr > 0 ? inr : FALLBACK_USDC_INR
}

export function convertInrToUsdc(inrAmount: number, usdcInrRate: number): number {
  if (!usdcInrRate || !Number.isFinite(usdcInrRate) || usdcInrRate <= 0) return 0
  return inrAmount / usdcInrRate
}

