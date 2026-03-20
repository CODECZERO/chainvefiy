"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Globe } from "lucide-react"
import { getUSDCRates } from "@/lib/exchange-rates"
 
 const CURRENCIES = [
   { code: "USD", symbol: "$" },
   { code: "INR", symbol: "₹" },
   { code: "EUR", symbol: "€" },
   { code: "GBP", symbol: "£" },
   { code: "NGN", symbol: "₦" },
   { code: "BRL", symbol: "R$" },
 ]
 
 export function USDCPriceTicker() {
   const [rates, setRates] = useState<Record<string, number>>({})
   const [loading, setLoading] = useState(true)
 
   useEffect(() => {
     const fetchPrices = async () => {
       try {
         const data = await getUSDCRates(CURRENCIES.map(c => c.code.toLowerCase()))
         if (data && Object.keys(data).length > 0) {
           setRates(data)
         }
       } catch (error) {
         console.error("Failed to fetch USDC prices", error)
       } finally {
         setLoading(false)
       }
     }
 
     fetchPrices()
     const interval = setInterval(fetchPrices, 60000) // Update every minute
     return () => clearInterval(interval)
   }, [])


  if (loading && Object.keys(rates).length === 0) {
    return (
      <div className="flex gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-6 w-24 bg-white/5 rounded-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center overflow-hidden h-10 bg-white/[0.02] border-y border-white/[0.04] backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 border-r border-white/[0.06] bg-white/[0.02] shrink-0">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live USDC</span>
      </div>
      <div className="flex items-center gap-8 px-6 animate-scroll whitespace-nowrap">
        {CURRENCIES.map(c => (
          <div key={c.code} className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">{c.code}</span>
            <span className="text-sm font-mono font-bold text-white">
              {c.symbol}{rates[c.code.toLowerCase()] ? Number(rates[c.code.toLowerCase()]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
            </span>
            <TrendingUp className="w-3 h-3 text-emerald-500 opacity-50" />
          </div>
        ))}
        {/* Duplicate for seamless scrolling */}
        {CURRENCIES.map(c => (
          <div key={`${c.code}-dup`} className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">{c.code}</span>
            <span className="text-sm font-mono font-bold text-white">
              {c.symbol}{rates[c.code.toLowerCase()] ? Number(rates[c.code.toLowerCase()]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
            </span>
            <TrendingUp className="w-3 h-3 text-emerald-500 opacity-50" />
          </div>
        ))}
      </div>
    </div>
  )
}
