"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  ShieldCheck, MessageCircle, Wallet, ArrowRight, ArrowUpRight,
  Star, Users, Package, Zap, CheckCircle2, XCircle,
  Globe, Lock, TrendingUp, Sparkles, Eye, Award,
  Leaf, Shirt, Droplet, Apple, Coffee, Flower,
  ShoppingBag, ThumbsUp
} from "lucide-react"

// ─── Data ───
const TRUST_SIGNALS = [
  { icon: <Lock className="w-4 h-4" />, text: "Escrow Protected" },
  { icon: <Eye className="w-4 h-4" />, text: "Community Verified" },
  { icon: <Globe className="w-4 h-4" />, text: "On-Chain Records" },
]

const STATS_CONFIG = [
  { key: "verifiedProducts", label: "Products Verified", defaultValue: 0, suffix: "+", icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" /> },
  { key: "totalSuppliers", label: "Active Suppliers", defaultValue: 0, suffix: "+", icon: <Users className="w-5 h-5 text-orange-400" /> },
  { key: "totalUsdcTransacted", label: "USDC Transacted", defaultValue: 0, prefix: "$", suffix: "+", icon: <Wallet className="w-5 h-5 text-purple-400" /> },
  { key: "avgVerifyTime", label: "Avg Verify Time", defaultValue: 0, suffix: " hrs", icon: <Zap className="w-5 h-5 text-amber-400" /> },
]

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <MessageCircle className="w-6 h-6" />,
    color: "from-green-500 to-emerald-600",
    title: "List via WhatsApp",
    desc: "Send photos & videos of your product on WhatsApp. No app download needed. Our AI guides you in 2 minutes.",
  },
  {
    step: "02",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
    title: "Community Verifies",
    desc: "Real buyers vote on authenticity. 60%+ real votes earns Verified badge. Every vote is permanent on Stellar.",
  },
  {
    step: "03",
    icon: <Wallet className="w-6 h-6" />,
    color: "from-purple-500 to-indigo-500",
    title: "Pay → USDC Escrow",
    desc: "Buyers pay in XLM, BTC, ETH, or UPI. Auto-converted to USDC via Stellar DEX. Held in Soroban escrow until delivery.",
  },
]

const PAYMENT_METHODS = [
  { name: "XLM", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { name: "USDC", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { name: "BTC", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { name: "ETH", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { name: "UPI", color: "bg-green-500/10 text-green-400 border-green-500/20" },
]

const FEATURED: any[] = []

// ─── Animated Counter ───
function AnimatedCounter({ end, prefix = "", suffix = "" }: { end: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true)
      }
    }, { threshold: 0.3 })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const duration = 2000
    const steps = 60
    const increment = end / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [started, end])

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  )
}

import { getProducts, getStats } from "@/lib/api-service"
import { convertInrToUsdc, getUSDCInrRate } from "@/lib/exchange-rates"

// ─── Main Page ───
export default function Home() {
  const [featured, setFeatured] = useState<any[]>(FEATURED)
  const [stats, setStats] = useState<any>({
    verifiedProducts: 0,
    totalSuppliers: 0,
    totalUsdcTransacted: 0,
    avgVerifyTime: 0
  })
  const [usdcInr, setUsdcInr] = useState(83.33)

  useEffect(() => {
    getUSDCInrRate().then(setUsdcInr).catch(() => {})

    // Fetch products
    getProducts({ status: 'VERIFIED', limit: '6' })
      .then(res => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.slice(0, 6).map((p: any) => ({
            id: p.id,
            title: p.title,
            supplier: p.supplier?.name || "Unknown",
            location: p.supplier?.location || "Unknown",
            price: `₹${p.priceInr}`,
            usdc: (
              (typeof p.priceUsdc === "number" && p.priceUsdc > 0)
                ? p.priceUsdc
                : convertInrToUsdc(Number(p.priceInr) || 0, usdcInr)
            ).toFixed(2),
            votes: p.voteReal || 0,
            fakes: p.voteFake || 0,
            icon: p.proofMediaUrls?.[0] ? null : <Package className="w-12 h-12 text-slate-500 opacity-60" />,
            image: p.proofMediaUrls?.[0],
            category: p.category || "Other"
          }))
          setFeatured(mapped)
        }
      })
      .catch(console.error)

    // Fetch stats
    getStats()
      .then(res => {
        if (res.success && res.data) {
          setStats({
            verifiedProducts: res.data.verifiedProducts || 0,
            totalSuppliers: res.data.totalSuppliers || 0,
            totalUsdcTransacted: Math.floor(res.data.totalUsdcTransacted) || 0,
            avgVerifyTime: res.data.avgVerifyTime || 0
          })
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Header />

      {/* ══════════ HERO ══════════ */}
      <section className="relative py-20 md:py-28 px-4">
        {/* Background orbs */}
        <div className="orb w-[500px] h-[500px] bg-orange-600/20 -top-40 -left-40 animate-float" />
        <div className="orb w-[400px] h-[400px] bg-emerald-600/15 top-20 right-[-10%] animate-float delay-200" />
        <div className="orb w-[300px] h-[300px] bg-amber-600/10 bottom-0 left-1/3 animate-float delay-400" />

        <div className="relative max-w-6xl mx-auto">
          {/* Trust badges row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-fade-in-up">
            {TRUST_SIGNALS.map((s) => (
              <span
                key={s.text}
                className="inline-flex items-center gap-1.5 bg-background/60 border border-border rounded-full px-3.5 py-1.5 text-xs text-muted-foreground font-medium backdrop-blur-sm"
              >
                {s.icon} {s.text}
              </span>
            ))}
          </div>

          {/* Headline */}
          <div className="text-center">
            <h1
              className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight mb-5 animate-fade-in-up delay-100"
              style={{ animationFillMode: "both" }}
            >
              A verified marketplace for real products.
              <span className="block mt-2 gradient-text">Paid safely in escrow.</span>
            </h1>

          {/* Sub */}
            <p
              className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in-up delay-200"
              style={{ animationFillMode: "both" }}
            >
              Community verification builds trust. Multi-currency checkout settles in USDC. Funds are released only after
              delivery confirmation.
            </p>

          {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up delay-300"
              style={{ animationFillMode: "both" }}
            >
            <Link href="/marketplace">
              <Button className="px-6 h-11 rounded-xl font-semibold">
                Browse marketplace <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="px-6 h-11 rounded-xl font-semibold">
                <MessageCircle className="w-4 h-4 mr-2" /> Sell via WhatsApp
              </Button>
            </a>
          </div>

          {/* Powered by */}
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground animate-fade-in-up delay-500"
              style={{ animationFillMode: "both" }}
            >
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="w-3 h-3" /> Stellar
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Lock className="w-3 h-3" /> Soroban escrow
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Zap className="w-3 h-3" /> NVIDIA NIM
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section className="relative border-y border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS_CONFIG.map((s) => (
            <div key={s.label} className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-muted border border-border flex items-center justify-center transition-colors">
                {s.icon}
              </div>
              <AnimatedCounter end={stats[s.key as keyof typeof stats] || s.defaultValue} prefix={s.prefix} suffix={s.suffix} />
              <div className="text-sm text-muted-foreground mt-2 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-3 block">Simple Process</span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How Pramanik Works</h2>
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">Three steps from listing to verified payment — no app download required</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="glass-card rounded-3xl p-8 relative group" style={{ animationDelay: `${i * 150}ms` }}>
              {/* Step number */}
              <span className="absolute top-6 right-6 text-6xl font-black text-white/[0.03] select-none">{s.step}</span>
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                {s.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ PAYMENT METHODS ══════════ */}
      <section className="border-y border-white/[0.04] bg-white/[0.01] py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3 block">Multi-Currency</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Pay Your Way. Always Settled in USDC.</h2>
          <p className="text-slate-400 mb-12 text-sm max-w-lg mx-auto">
            Powered by Stellar DEX — instant conversion, real money value, zero volatility risk for suppliers
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {PAYMENT_METHODS.map((p) => (
              <div key={p.name} className={`${p.color} border rounded-2xl px-6 py-4 flex items-center gap-3 font-bold text-lg backdrop-blur-sm hover:scale-105 transition-transform cursor-default`}>
                {p.name}
                <ArrowRight className="w-4 h-4 opacity-40" />
                <span className="text-blue-400 font-bold">USDC</span>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-3">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-400">Funds held in <span className="text-white font-medium">Soroban escrow</span> until delivery confirmed</span>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURED PRODUCTS ══════════ */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3 block">Marketplace</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Verified Products</h2>
            <p className="text-muted-foreground mt-2">Community-verified listings ready to order</p>
          </div>
          <Link href="/marketplace">
            <Button variant="outline" className="rounded-xl h-11 px-4 hidden md:flex">
              View All <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((p, i) => (
            <Card key={p.title} className="overflow-hidden group" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="relative h-48 bg-muted overflow-hidden">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {p.icon}
                  </div>
                )}

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <Badge className="gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </Badge>
                  <Badge variant="secondary">{p.category}</Badge>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-muted-foreground" /> {p.supplier} · {p.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold">{p.price}</div>
                    <div className="text-xs text-muted-foreground font-mono">≈ {p.usdc} USDC</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {p.votes} real
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" /> {p.fakes} fake
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${(p.votes / Math.max(1, p.votes + p.fakes)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={p.id ? `/product/${p.id}` : "/marketplace"}>View product</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/marketplace">More</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-8 text-center md:hidden">
          <Link href="/marketplace">
            <Button variant="outline" className="rounded-2xl h-auto py-3 px-8">
              View All Products <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ══════════ WHATSAPP CTA ══════════ */}
      <section className="mx-4 md:mx-auto max-w-6xl mb-24">
        <div className="relative overflow-hidden glass-card rounded-[2rem] px-8 md:px-14 py-16">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-950/60 via-transparent to-transparent" />
          <div className="orb w-[300px] h-[300px] bg-green-600/20 -top-20 -left-20" />

          <div className="relative flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 text-xs text-green-400 font-semibold mb-6">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp First — No App Needed
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Start Selling<br />in 2 Minutes
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed max-w-md">
                No app download. No complicated setup. No website needed.
                Just WhatsApp us your product photos and our NVIDIA-powered AI lists it automatically.
              </p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-semibold text-base h-auto shadow-lg shadow-green-600/25 hover:shadow-green-500/40 transition-all">
                  <MessageCircle className="w-5 h-5 mr-2" /> Open WhatsApp
                </Button>
              </a>
            </div>

            {/* Chat preview */}
            <div className="bg-[#0a0e1a] border border-white/[0.06] rounded-3xl p-5 w-80 shrink-0 font-mono text-xs space-y-3 animate-pulse-glow">
              <div className="text-slate-500 text-center pb-3 border-b border-white/[0.06] flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Pramanik AI Bot
              </div>
              <div className="flex justify-end"><span className="bg-green-700 rounded-2xl rounded-tr-sm px-4 py-2 text-white">NEW</span></div>
              <div className="flex justify-start"><span className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-2 text-slate-200">Let&apos;s list your product! <ShoppingBag className="w-3.5 h-3.5 inline mb-0.5" /> What is your product name?</span></div>
              <div className="flex justify-end"><span className="bg-green-700 rounded-2xl rounded-tr-sm px-4 py-2 text-white">Organic Turmeric 500g</span></div>
              <div className="flex justify-start"><span className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-2 text-slate-200">Great! <ThumbsUp className="w-3.5 h-3.5 inline mb-0.5" /> Price in INR?</span></div>
              <div className="flex justify-end"><span className="bg-green-700 rounded-2xl rounded-tr-sm px-4 py-2 text-white">450</span></div>
              <div className="flex justify-start"><span className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-2 text-slate-200"><CheckCircle2 className="w-3.5 h-3.5 inline mb-0.5 text-green-400" /> Listed for ≈5.30 USDC! Pending verification.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-white/[0.04] py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 font-bold text-xl mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                Pramanik
              </div>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                The verified open marketplace on Stellar blockchain. Every product proven real by community consensus.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-16">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">Marketplace</div>
                <div className="space-y-3">
                  <Link href="/marketplace" className="block text-sm text-slate-400 hover:text-white transition-colors">Browse Products</Link>
                  <Link href="/verify" className="block text-sm text-slate-400 hover:text-white transition-colors">Verify Products</Link>
                  <Link href="/leaderboard" className="block text-sm text-slate-400 hover:text-white transition-colors">Leaderboard</Link>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">Sellers</div>
                <div className="space-y-3">
                  <Link href="/seller-dashboard" className="block text-sm text-slate-400 hover:text-white transition-colors">Dashboard</Link>
                  <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors">Sell via WhatsApp</a>
                  <Link href="/whatsapp-setup" className="block text-sm text-slate-400 hover:text-white transition-colors">WhatsApp Setup</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-600">© 2024 Pramanik. Verified marketplace on Stellar.</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 border border-white/[0.06] rounded-full px-4 py-1.5 bg-white/[0.02]">Built on Stellar</span>
              <span className="text-xs text-slate-500 border border-white/[0.06] rounded-full px-4 py-1.5 bg-white/[0.02]">Payments in USDC</span>
              <span className="text-xs text-slate-500 border border-white/[0.06] rounded-full px-4 py-1.5 bg-white/[0.02]">AI by NVIDIA NIM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
