"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search, CheckCircle2, XCircle, Clock, Package, ArrowUpDown,
  Sparkles, Award, ShoppingBag, Leaf, Palette, Cpu, Gem, LayoutGrid
} from "lucide-react"
import Link from "next/link"
import { convertInrToUsdc, getUSDCInrRate } from "@/lib/exchange-rates"
import { ProductCard } from "@/components/product-card"
import { motion } from "framer-motion"

const CATEGORIES = [
  { name: "All", icon: <LayoutGrid className="w-4 h-4" /> },
  { name: "Food & Spices", icon: <Leaf className="w-4 h-4" /> },
  { name: "Textiles", icon: <ShoppingBag className="w-4 h-4" /> },
  { name: "Handicrafts", icon: <Palette className="w-4 h-4" /> },
  { name: "Agriculture", icon: <Sparkles className="w-4 h-4" /> },
  { name: "Electronics", icon: <Cpu className="w-4 h-4" /> },
  { name: "Jewelry", icon: <Gem className="w-4 h-4" /> },
]

interface Product {
  id: string
  title: string
  description?: string
  category: string
  priceInr: number
  priceUsdc?: number
  status: string
  proofMediaUrls: string[]
  voteReal: number
  voteFake: number
  supplier: { name: string; location: string; trustScore: number; isVerified: boolean }
}

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high" | "most-voted">("newest")
  const [usdcInr, setUsdcInr] = useState<number>(83.33)

  useEffect(() => { loadProducts() }, [category, verifiedOnly])
  useEffect(() => { getUSDCInrRate().then(setUsdcInr).catch(() => {}) }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (category !== "All") params.set("category", category)
      if (verifiedOnly) params.set("status", "VERIFIED")
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?${params}`)
      const data = await res.json()
      setProducts(data.data?.products || [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = products
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.priceInr - b.priceInr
        case "price-high": return b.priceInr - a.priceInr
        case "most-voted": return (b.voteReal + b.voteFake) - (a.voteReal + a.voteFake)
        default: return 0
      }
    })

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header />
      
      {/* ── Page Header ── */}
      <div className="relative border-b border-white/[0.04] bg-[#0A0D14] overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" /> Open Marketplace
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Verified Products.<br/>
              <span className="text-glow-orange text-orange-400">Trusted Suppliers.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl">
              Discover authentic goods powered by community consensus. Every item is backed by immutable proof and secure escrow payments.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* ── Filters & Search ── */}
        <div className="premium-card rounded-3xl p-4 md:p-6 mb-12 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                placeholder="Search verified products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-14 rounded-2xl h-14 text-base bg-[#0C0F17] border-white/[0.06] focus-visible:ring-orange-500 focus-visible:border-orange-500 shadow-inner"
              />
            </div>
            
            {/* Toggles & Sort */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-bold transition-all border-2 ${
                  verifiedOnly
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : "bg-[#0C0F17] border-white/[0.06] text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${verifiedOnly ? "text-emerald-400" : "text-slate-500"}`} /> 
                Show Verified Only
              </button>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-[#0C0F17] border-2 border-white/[0.06] text-white font-semibold rounded-2xl px-6 py-4 pr-12 text-sm cursor-pointer hover:border-slate-500 transition-colors focus:outline-none focus:border-orange-500 h-[56px]"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="most-voted">Most Community Votes</option>
                </select>
                <ArrowUpDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-6 mt-6 border-t border-white/[0.06] custom-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2 ${
                  category === c.name
                    ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30"
                    : "bg-transparent border-white/[0.06] text-slate-400 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Product Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="premium-card rounded-3xl overflow-hidden h-[450px]">
                <div className="h-56 bg-white/[0.02] animate-pulse" />
                <div className="p-6 space-y-5">
                  <div className="h-6 bg-white/[0.04] rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-white/[0.03] rounded-lg w-1/2 animate-pulse" />
                  <div className="h-12 bg-white/[0.03] rounded-2xl animate-pulse mt-8" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} task={p} index={i} usdcInr={usdcInr} />
              ))}
            </div>
            
            {filtered.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl mx-auto text-center py-24 premium-card rounded-[3rem] mt-12"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#0C0F17] flex items-center justify-center border border-white/[0.06] shadow-inner">
                  <Package className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No products match your search</h3>
                <p className="text-base text-slate-400 mb-8 max-w-sm mx-auto">
                  Try adjusting your filters, trying a different category, or removing your search term.
                </p>
                <Button 
                  onClick={() => { setSearch(""); setCategory("All"); setVerifiedOnly(false); }}
                  className="rounded-xl h-12 px-8 font-bold border-white/[0.1] bg-[#0C0F17] hover:bg-white hover:text-black transition-all"
                  variant="outline"
                >
                  Clear All Filters
                </Button>
              </motion.div>
            )}
          </>
        )}

        {/* ── Results count ── */}
        {!loading && filtered.length > 0 && (
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0C0F17] border border-white/[0.06] text-sm text-slate-400 shadow-inner">
              Showing <strong className="text-white mx-1">{filtered.length}</strong> products
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
