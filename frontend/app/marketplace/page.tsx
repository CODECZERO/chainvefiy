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

const CATEGORIES = [
  { name: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { name: "Food & Spices", icon: <Leaf className="w-3.5 h-3.5" /> },
  { name: "Textiles", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { name: "Handicrafts", icon: <Palette className="w-3.5 h-3.5" /> },
  { name: "Agriculture", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { name: "Electronics", icon: <Cpu className="w-3.5 h-3.5" /> },
  { name: "Jewelry", icon: <Gem className="w-3.5 h-3.5" /> },
]

const STATUS_BADGE: Record<string, { label: string; class: string; icon: ReactNode }> = {
  VERIFIED: {
    label: "Verified",
    class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    class: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <Clock className="w-3 h-3" />,
  },
  FLAGGED: {
    label: "Flagged",
    class: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
}

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
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high" | "most-voted">("newest")
  const [usdcInr, setUsdcInr] = useState<number>(83.33)

  useEffect(() => {
    loadProducts()
  }, [category, verifiedOnly])

  useEffect(() => {
    getUSDCInrRate().then(setUsdcInr).catch(() => {})
  }, [])

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
      setProducts(MOCK_PRODUCTS)
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="gradient-text">Marketplace</span>
          </h1>
          <p className="text-slate-400 mt-3 text-lg">Browse community-verified products from trusted suppliers</p>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 rounded-2xl h-12 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Verified Only toggle */}
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-all ${
                verifiedOnly
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-background border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Only
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-background border border-border text-foreground rounded-2xl px-4 py-3 pr-10 text-sm cursor-pointer hover:bg-accent transition-colors focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="most-voted">Most Voted</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-10">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => setCategory(c.name)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all border ${
                category === c.name
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-3xl overflow-hidden">
                <div className="h-48 bg-white/[0.02] animate-shimmer" />
                <div className="p-5 space-y-4">
                  <div className="h-5 bg-white/[0.04] rounded-lg w-3/4 animate-shimmer" />
                  <div className="h-4 bg-white/[0.03] rounded-lg w-1/2 animate-shimmer" />
                  <div className="h-10 bg-white/[0.03] rounded-2xl animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} task={p} index={i} usdcInr={usdcInr} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-24">
                <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-300">No products found</h3>
                <p className="text-sm text-slate-500 mt-2">Try a different search or category filter</p>
              </div>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && filtered.length > 0 && (
          <div className="mt-8 text-center text-sm text-slate-500">
            Showing <span className="text-slate-300 font-medium">{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

// No mock products - taking real time data
const MOCK_PRODUCTS: Product[] = []
