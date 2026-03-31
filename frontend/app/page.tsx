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
import { getProducts, getStats } from "@/lib/api-service"
import { convertInrToUsdc, getUSDCInrRate } from "@/lib/exchange-rates"
import { motion, useInView } from "framer-motion"

const TRUST_SIGNALS = [
  { icon: <Lock className="w-4 h-4" />, text: "Escrow Protected" },
  { icon: <Eye className="w-4 h-4" />, text: "Community Verified" },
  { icon: <Globe className="w-4 h-4" />, text: "Immutable On-Chain Records" },
]

const STATS_CONFIG = [
  { key: "verifiedProducts", label: "Products Verified", defaultValue: 0, suffix: "+", icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" /> },
  { key: "totalSuppliers", label: "Active Suppliers", defaultValue: 0, suffix: "+", icon: <Users className="w-6 h-6 text-orange-400" /> },
  { key: "totalUsdcTransacted", label: "USDC Transacted", defaultValue: 0, prefix: "$", suffix: "+", icon: <Wallet className="w-6 h-6 text-blue-400" /> },
  { key: "avgVerifyTime", label: "Avg Verify Time", defaultValue: 0, suffix: " hrs", icon: <Zap className="w-6 h-6 text-amber-400" /> },
]

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <MessageCircle className="w-8 h-8" />,
    color: "from-green-500 to-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.2)]",
    title: "List Effortlessly via WhatsApp",
    desc: "Send photos & videos of your product on WhatsApp. No app download needed. Our AI guides you in 2 minutes and creates a beautiful listing.",
  },
  {
    step: "02",
    icon: <ShieldCheck className="w-8 h-8" />,
    color: "from-blue-500 to-cyan-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]",
    title: "Community Verification",
    desc: "Real buyers vote on authenticity. 60%+ real votes earns the Verified badge. Every vote is permanently recorded on the Stellar blockchain.",
  },
  {
    step: "03",
    icon: <Wallet className="w-8 h-8" />,
    color: "from-purple-500 to-indigo-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]",
    title: "Secure USDC Escrow Payments",
    desc: "Buyers pay with their preferred currency. Funds are auto-converted to USDC via Stellar DEX and held in secure Soroban escrow until delivery is confirmed.",
  },
]

const PAYMENT_METHODS = [
  { name: "USDC", color: "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]" },
  { name: "XLM", color: "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" },
  { name: "BTC", color: "bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]" },
  { name: "ETH", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]" },
  { name: "UPI", color: "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]" },
]

function AnimatedCounter({ end, prefix = "", suffix = "" }: { end: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true)
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
    <div ref={ref} className="text-5xl md:text-6xl font-bold font-mono tracking-tighter text-white drop-shadow-2xl">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  )
}

export default function Home() {
  const [stats, setStats] = useState<any>({
    verifiedProducts: 0,
    totalSuppliers: 0,
    totalUsdcTransacted: 0,
    avgVerifyTime: 0
  })

  useEffect(() => {
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
    <div className="min-h-screen bg-[#06080A] text-foreground overflow-hidden">
      <Header />

      {/* ══════════ HERO SECTION ══════════ */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-36 px-4 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-orange-500/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="noise" />

        <div className="relative max-w-7xl mx-auto z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {TRUST_SIGNALS.map((s) => (
              <span
                key={s.text}
                className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-full px-5 py-2.5 text-sm text-slate-300 font-semibold backdrop-blur-xl shadow-lg"
              >
                {s.icon} {s.text}
              </span>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
            className="text-center max-w-5xl mx-auto"
          >
            <h1 className="text-6xl sm:text-7xl md:text-[6rem] leading-[1.05] font-extrabold tracking-tight mb-8">
              Verified Marketplace.<br />
              <span className="text-glow-orange text-orange-400">Real Products.</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Community verification builds absolute trust. Multi-currency checkout settles in USDC. Funds are released only after immutable delivery confirmation.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Link href="/marketplace">
                <Button className="w-full sm:w-auto px-10 h-16 rounded-[1.25rem] text-lg font-bold bg-white text-black hover:bg-slate-200 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] transition-all">
                  Enter Marketplace <ArrowRight className="w-5 h-5 ml-2 border border-black/20 rounded-full p-0.5" />
                </Button>
              </Link>
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full sm:w-auto px-10 h-16 rounded-[1.25rem] text-lg font-bold border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all">
                  <MessageCircle className="w-5 h-5 mr-2.5" /> Sell via WhatsApp
                </Button>
              </a>
            </div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 uppercase tracking-widest font-semibold">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-slate-400" /> Powered by Stellar</span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400" /> Soroban Smart Escrow</span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-slate-400" /> NVIDIA AI</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ LIVE STATS ══════════ */}
      <section className="relative bg-[#0A0D14] border-y border-white/[0.04] py-24">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
          {STATS_CONFIG.map((s, i) => (
            <motion.div 
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="px-6 py-6 sm:py-0"
            >
              <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-[#111827] border border-white/[0.08] shadow-lg flex items-center justify-center text-white">
                {s.icon}
              </div>
              <AnimatedCounter end={stats[s.key as keyof typeof stats] || s.defaultValue} prefix={s.prefix} suffix={s.suffix} />
              <div className="text-base text-slate-400 mt-3 font-semibold uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ PROCESS ══════════ */}
      <section className="py-32 bg-[#06080A]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
              Lightning Fast Onboarding
            </span>
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">Built for simplicity.</h2>
            <p className="text-xl text-slate-400 leading-relaxed">
              We abstracted away the complex blockchain mechanics. You interact via familiar interfaces while Soroban handles the heavy lifting in the background.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div 
                key={s.step} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: i * 0.2 }}
                className="premium-card rounded-[2.5rem] p-10 relative overflow-hidden group"
              >
                <div className="absolute top-10 right-10 text-[8rem] font-bold text-white/[0.02] leading-none select-none pointer-events-none group-hover:scale-110 group-hover:text-white/[0.03] transition-all duration-700">
                  {s.step}
                </div>
                
                <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-8 relative z-10`}>
                  {s.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4 relative z-10">{s.title}</h3>
                <p className="text-lg text-slate-400 leading-relaxed relative z-10">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PAYMENTS ══════════ */}
      <section className="bg-[#0A0D14] border-y border-white/[0.04] py-32 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[150px] rounded-[100%] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
            Global Liquidity
          </span>
          <h2 className="text-5xl md:text-6xl font-extrabold mb-8 tracking-tight">Pay your way. Settled in USDC.</h2>
          <p className="text-xl text-slate-400 mb-16 max-w-2xl mx-auto leading-relaxed">
            Stellar DEX handles path payments instantly behind the scenes. Zero volatility risk. Absolute certainty for suppliers.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {PAYMENT_METHODS.map((p, i) => (
              <motion.div 
                key={p.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`${p.color} border-2 rounded-2xl px-8 py-5 flex items-center gap-4 font-bold text-xl backdrop-blur-xl hover:scale-105 transition-transform duration-300 cursor-default bg-[#0C0F17]/80`}
              >
                {p.name}
                <ArrowRight className="w-5 h-5 opacity-40 mix-blend-screen" />
                <span className="text-white font-black bg-blue-600/20 px-3 py-1 rounded-lg">USDC</span>
              </motion.div>
            ))}
          </div>

          <div className="inline-flex items-center gap-3 bg-[#0C0F17] border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl px-6 py-4">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span className="text-base text-slate-300 font-medium tracking-wide">
              Smart contracts lock funds until <span className="text-white font-bold underline decoration-emerald-500/50 underline-offset-4">delivery is verified</span>.
            </span>
          </div>
        </div>
      </section>

      {/* ══════════ WHATSAPP CTA CTA ══════════ */}
      <section className="py-32 px-4 max-w-7xl mx-auto">
        <div className="premium-card rounded-[3rem] px-8 py-16 md:p-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-950/80 to-[#111827] pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-green-500/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="flex-1 text-center lg:text-left max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
                <MessageCircle className="w-4 h-4" /> Start In Seconds
              </span>
              <h2 className="text-5xl md:text-6xl font-extrabold mb-8 tracking-tight leading-[1.1]">
                Your storefront,<br/>living in WhatsApp.
              </h2>
              <p className="text-xl text-slate-300 mb-10 leading-relaxed font-light">
                Send photos. Tell us the price. Our AI builds your premium blockchain listing instantly. No emails, no complex dashboards.
              </p>
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button className="h-16 px-10 rounded-2xl text-lg font-bold bg-green-500 hover:bg-green-400 text-white shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:shadow-[0_0_60px_rgba(34,197,94,0.4)] transition-all border-0">
                  Open WhatsApp <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>

            <div className="bg-[#06080A]/90 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] p-6 w-full max-w-md shrink-0 shadow-2xl font-mono text-sm space-y-4">
              <div className="flex items-center justify-center gap-3 pb-5 border-b border-white/[0.06] text-slate-400 font-sans font-semibold">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
                Pramanik AI Assitant
              </div>
              <div className="flex flex-col gap-4 py-2">
                <div className="flex justify-end"><span className="bg-green-600/90 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm text-base">NEW</span></div>
                <div className="flex justify-start"><span className="bg-white/[0.05] text-slate-200 border border-white/[0.05] rounded-2xl rounded-tl-sm px-5 py-3 text-base">Let's create a listing. <ShoppingBag className="w-4 h-4 inline mb-1 mx-1" /> What is the name of your product?</span></div>
                <div className="flex justify-end"><span className="bg-green-600/90 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm text-base">Organic Matcha 200g</span></div>
                <div className="flex justify-start"><span className="bg-white/[0.05] text-slate-200 border border-white/[0.05] rounded-2xl rounded-tl-sm px-5 py-3 text-base">Perfect. Price in INR?</span></div>
                <div className="flex justify-end"><span className="bg-green-600/90 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm text-base">650</span></div>
                <div className="flex justify-start"><span className="bg-white/[0.05] text-slate-200 border border-white/[0.05] rounded-2xl rounded-tl-sm px-5 py-3 text-base"><CheckCircle2 className="w-4 h-4 inline mb-1 mr-1 text-green-400" /> Done. Listed for ≈7.80 USDC!</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-white/[0.04] bg-[#0A0D14] py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 font-extrabold text-2xl mb-4 tracking-tight">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                Pramanik
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                The enterprise-grade marketplace powered by absolute truth on the Stellar blockchain.
              </p>
            </div>

            <div className="flex gap-16 md:gap-24">
              <div>
                <div className="text-xs text-slate-300 uppercase tracking-widest font-bold mb-6">Ecosystem</div>
                <div className="space-y-4">
                  <Link href="/marketplace" className="block text-base font-medium text-slate-500 hover:text-white hover:translate-x-1 transition-all">Marketplace</Link>
                  <Link href="/verify" className="block text-base font-medium text-slate-500 hover:text-white hover:translate-x-1 transition-all">Verify Products</Link>
                  <Link href="/leaderboard" className="block text-base font-medium text-slate-500 hover:text-white hover:translate-x-1 transition-all">Leaderboard</Link>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-300 uppercase tracking-widest font-bold mb-6">Partners</div>
                <div className="space-y-4">
                  <Link href="/seller-dashboard" className="block text-base font-medium text-slate-500 hover:text-white hover:translate-x-1 transition-all">Supplier Dashboard</Link>
                  <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer" className="block text-base font-medium text-slate-500 hover:text-white hover:translate-x-1 transition-all">Sell via WhatsApp</a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-sm font-medium text-slate-600">© 2024 Pramanik. All rights reserved.</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs font-bold text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 uppercase tracking-widest">Stellar Network</span>
              <span className="text-xs font-bold text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 uppercase tracking-widest">USDC Settlement</span>
              <span className="text-xs font-bold text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 uppercase tracking-widest">NVIDIA NIM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
