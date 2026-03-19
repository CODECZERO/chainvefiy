"use client"
 
 import { useEffect, useState } from "react"
 import { TrendingUp } from "lucide-react"
 import { getExchangeRate } from "@/lib/exchange-rates"
 
 interface StellarPriceProps {
   amount?: number;
   showPrice?: boolean;
   onPriceLoad?: (price: number) => void;
 }
 
 export function StellarPriceDisplay({ amount, showPrice = false, onPriceLoad }: StellarPriceProps) {
   const [isMounted, setIsMounted] = useState(false)
   const [price, setPrice] = useState<number | null>(null)
   const [isLoading, setIsLoading] = useState(false)
 
   useEffect(() => {
     setIsMounted(true)
 
     const fetchPrice = async () => {
       try {
         setIsLoading(true)
         const rate = await getExchangeRate()
         setPrice(rate)
         onPriceLoad?.(rate)
       } catch (error) {
         console.error("Failed to fetch Stellar price", error)
       } finally {
         setIsLoading(false)
       }
     }


    if (isMounted && showPrice) {
      fetchPrice()
      const interval = setInterval(fetchPrice, 5 * 60 * 1000) // Update every 5 minutes
      return () => clearInterval(interval)
    }
  }, [isMounted, showPrice, onPriceLoad])

  // Don't render anything if not showing price
  if (!showPrice) {
    return null
  }

  // Don't render anything on server-side
  if (!isMounted) {
    return <div className="h-5 w-24" />
  }

  // If still loading or no price available
  if (isLoading || !price) {
    return <div className="h-5 w-24 bg-muted/20 rounded animate-pulse" />
  }

  // Show the conversion if amount is provided
  if (amount !== undefined) {
    const xlmAmount = amount / price;
    return (
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        <TrendingUp className="h-3 w-3 text-orange-600" />
        <span>~ {xlmAmount.toFixed(4)} XLM</span>
        <span className="text-zinc-700 underline decoration-zinc-800 underline-offset-4">ESTIMATED SPIRIT PRESSURE</span>
      </div>
    );
  }

  // Show the current XLM price in INR
  return (
    <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 px-4 py-2 rounded-md">
      <TrendingUp className="h-4 w-4 text-orange-600" />
      <div className="text-[10px] font-black uppercase italic tracking-widest">
        <span className="text-white">1 XLM</span>
        <span className="text-orange-500 ml-2">₹{price.toFixed(2)}</span>
      </div>
    </div>
  )
}
