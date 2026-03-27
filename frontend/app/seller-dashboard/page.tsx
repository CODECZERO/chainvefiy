"use client"

import React, { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import { convertInrToUsdc } from "@/lib/exchange-rates"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  BarChart3, Package, Users, ShoppingCart, ArrowUpRight,
  ExternalLink, Copy, QrCode, Bell, Camera, Video, MapPin, Tag, Zap, Lock, Coins, Eye, Download, X,
  Wallet, MessageCircle, Plus, CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle, ChevronRight, Star, Settings, BarChart2
}
from "lucide-react"
import dynamic from 'next/dynamic'
import Image from "next/image"
import { getIPFSUrl } from "@/lib/image-utils"
import { CustomerManager } from "@/components/customer-manager"

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const RechartsTooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })

const NAV = [
  { id: "overview",     label: "Overview",        icon: BarChart2 },
  { id: "listings",     label: "My Listings",      icon: Package },
  { id: "orders",       label: "Orders",           icon: ShoppingCart },
  { id: "earnings",     label: "Earnings",         icon: Wallet },
  { id: "verification", label: "Verification Tips", icon: CheckCircle2 },
  { id: "whatsapp",     label: "WhatsApp Setup",   icon: MessageCircle },
  { id: "bounties",     label: "Bounties",         icon: Coins },
  { id: "customers",    label: "Customer Manager",  icon: Users },
]

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  VERIFIED:             { label: "Verified",  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  PENDING_VERIFICATION: { label: "Pending",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",     dot: "bg-amber-400" },
  FLAGGED:              { label: "Flagged",   cls: "bg-red-500/10 text-red-400 border-red-500/20",           dot: "bg-red-400" },
  PAID:                 { label: "Paid",      cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",        dot: "bg-blue-400" },
  COMPLETED:            { label: "Completed", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  DISPUTED:             { label: "Disputed",  cls: "bg-red-500/10 text-red-400 border-red-500/20",           dot: "bg-red-400" },
  SHIPPED:              { label: "Shipped",   cls: "bg-purple-500/10 text-purple-400 border-purple-500/20",  dot: "bg-purple-400" },
  ACTIVE:               { label: "Active",    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",     dot: "bg-amber-400" },
}

export default function SellerDashboard() {
  const [active, setActive] = useState("overview")
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [bounties, setBounties] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, pending: 0, flagged: 0, totalSales: 0, usdcBalance: "0.0000", usdcInr: "0", analytics: null as any })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedQrProduct, setSelectedQrProduct] = useState<any>(null)
  const { user } = useSelector((s: RootState) => s.userAuth)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const sid = user?.supplierProfile?.id

  useEffect(() => { loadAll() }, [sid])

  const loadAll = async () => {
    setLoading(true)
    try {
      if (sid) {
        const [prodRes, ordRes, anRes, bntRes] = await Promise.all([
          fetch(`${api}/suppliers/${sid}/products`, { credentials: "include" }),
          fetch(`${api}/donations/supplier/${sid}`, { credentials: "include" }),
          fetch(`${api}/suppliers/${sid}/analytics`, { credentials: "include" }),
          fetch(`${api}/bounties/supplier/${sid}`, { credentials: "include" })
        ])
        const prods = (await prodRes.json()).data || []
        const ords  = (await ordRes.json()).data  || []
        const analyticsData = (await anRes.json()).data || null
        const bnts  = (await bntRes.json()).data || []
        setProducts(prods)
        setOrders(ords)
        setBounties(bnts)
        const completed = ords.filter((o: any) => o.status === "COMPLETED")
        const totalUsdc = completed.reduce((s: number, o: any) => s + Number(o.priceUsdc || 0), 0)
        setStats({
          active:       prods.filter((p: any) => p.status === "VERIFIED").length,
          pending:      prods.filter((p: any) => p.status === "PENDING_VERIFICATION").length,
          flagged:      prods.filter((p: any) => p.status === "FLAGGED").length,
          totalSales:   completed.length,
          usdcBalance:  totalUsdc.toFixed(4),
          usdcInr:      (totalUsdc * 85).toFixed(0),
          analytics:    analyticsData
        })
      }
    } catch {}
    setLoading(false)
  }

  const copyWallet = () => {
    if (user?.stellarWallet) navigator.clipboard.writeText(user.stellarWallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "SUPPLIER") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Supplier Access Only</h1>
          <p className="text-muted-foreground mb-8">
            Please sign in as a supplier to access your dashboard and manage your listings.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/">
              <Button variant="outline" className="rounded-xl">Go Home</Button>
            </Link>
            <Button className="rounded-xl" onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}>
              Supplier Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-2">
          {/* Supplier card */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-xl font-bold shrink-0 text-primary-foreground">
                {String(user?.supplierProfile?.name || user?.email || "S")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{String(user?.supplierProfile?.name || "My Shop")}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {user?.supplierProfile?.isVerified && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-muted-foreground text-xs truncate">{String(user?.email || "")}</span>
                </div>
              </div>
            </div>
            {/* Trust Score bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Trust Score</span>
                <span className="font-semibold text-primary">{user?.supplierProfile?.trustScore ?? 0}/100</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${user?.supplierProfile?.trustScore ?? 0}%` }} />
              </div>
            </div>
          </div>

          {/* Nav items */}
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                active === n.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}>
              <n.icon className="w-4 h-4 shrink-0" />
              {n.label}
              {n.id === "listings" && stats.pending > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full">{String(stats.pending)}</span>
              )}
              {n.id === "orders" && orders.filter(o => o.status === "PAID").length > 0 && (
                <span className="ml-auto bg-orange-500/20 text-orange-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {String(orders.filter(o => o.status === "PAID").length)}
                </span>
              )}
            </button>
          ))}

          {/* USDC balance */}
          <div className="mt-auto bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2">USDC Balance</div>
            <div className="text-2xl font-bold font-mono text-[#2775CA]">{String(stats.usdcBalance)}</div>
            <div className="text-muted-foreground text-xs mt-0.5">≈ ₹{String(stats.usdcInr)}</div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 text-xs bg-background hover:bg-accent border border-border rounded-lg py-1.5 transition-colors">
                Withdraw
              </button>
              <button className="flex-1 text-xs bg-background hover:bg-accent border border-border rounded-lg py-1.5 transition-colors">
                History
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">

          {/* Mobile header row */}
          <div className="flex items-center justify-between mb-5 lg:hidden">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <div className="flex gap-2">
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-xl h-9 text-xs">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
              </a>
              <Link href="/seller-dashboard/new-product">
                <Button className="rounded-xl h-9 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> List
                </Button>
              </Link>
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          {active === "overview" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Overview</h2>
                <div className="flex gap-2">
                  <button onClick={loadAll} className="p-2 text-[#6B7280] hover:text-white border border-[#1F2D40] rounded-xl hover:border-[#E8772E]/30 transition-all">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <Link href="/seller-dashboard/new-product">
                    <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl h-9 text-sm">
                      <Plus className="w-4 h-4 mr-1.5" /> New Listing
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Active Listings", value: stats.active,     color: "text-emerald-400", bg: "from-emerald-500/5", icon: Package },
                  { label: "Pending Review",  value: stats.pending,    color: "text-amber-400",   bg: "from-amber-500/5",  icon: Clock },
                  { label: "Total Sales",     value: stats.totalSales, color: "text-blue-400",    bg: "from-blue-500/5",   icon: ShoppingCart },
                  { label: "USDC Earned",     value: stats.usdcBalance, color: "text-[#2775CA]",  bg: "from-[#2775CA]/5",  icon: Wallet },
                ].map(s => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.bg} to-[#111827] border border-[#1F2D40] rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-[#6B7280] text-xs">{s.label}</span>
                    </div>
                    {loading
                      ? <div className="h-8 bg-[#1C2333] rounded-lg animate-pulse" />
                      : <div className={`text-2xl font-bold font-mono ${s.color}`}>{String(s.value)}</div>
                    }
                  </div>
                ))}
              </div>

              {/* Charts & Analytics Row */}
              {stats.analytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 bg-[#111827] border border-[#1F2D40] rounded-2xl p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-4">Revenue Overview (USDC)</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.analytics.revenueByMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2D40" vertical={false} />
                          <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                          <RechartsTooltip cursor={{fill: '#1C2333'}} contentStyle={{backgroundColor: '#111827', borderColor: '#1F2D40', borderRadius: '8px'}} itemStyle={{color: '#2775CA'}} />
                          <Bar dataKey="uv" fill="#2775CA" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-[#0D1A2D] to-[#111827] border border-[#2775CA]/20 rounded-2xl p-5">
                      <div className="text-xs font-semibold uppercase tracking-widest text-[#2775CA]/70 mb-2">Category Rank</div>
                      <div className="text-2xl font-bold text-white">{String(stats.analytics.categoryRank || "-")}</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-900/20 to-[#111827] border border-emerald-500/20 rounded-2xl p-5">
                      <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500/70 mb-2">Loyalty Rate</div>
                      <div className="text-2xl font-bold text-emerald-400">{String(stats.analytics.repeatBuyerRate || "0%")}</div>
                    </div>
                    <div className="bg-[#111827] border border-[#1F2D40] rounded-2xl p-5 shadow-lg">
                      <div className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-3">Top Products</div>
                      {stats.analytics.topProducts?.length > 0 ? stats.analytics.topProducts.map((tp: any, i: number) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-[#1F2D40] last:border-0">
                          <span className="text-sm font-medium text-white truncate max-w-[150px]">{String(tp.title || "Product")}</span>
                          <span className="text-xs font-mono text-[#6B7280]">{String(tp.quantity || 0)} sold</span>
                        </div>
                      )) : <p className="text-[#6B7280] text-sm">No sales yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp CTA banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#0D2010] to-[#111827] border border-[#25D366]/20 rounded-2xl p-5 flex items-center gap-5">
                <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">List products instantly via WhatsApp</div>
                  <div className="text-[#9CA3AF] text-sm mt-0.5">No website needed. Send photos + price and we handle the rest.</div>
                </div>
                <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 rounded-xl h-9 text-sm whitespace-nowrap">
                    Open WhatsApp
                  </Button>
                </a>
              </div>

              {/* Flagged alert */}
              {stats.flagged > 0 && (
                <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-red-300">{String(stats.flagged)} listing{Number(stats.flagged) > 1 ? "s" : ""} flagged by community</div>
                    <div className="text-red-400/70 text-sm">Add better proof photos to resubmit for verification.</div>
                  </div>
                  <button onClick={() => setActive("listings")} className="text-red-400 text-sm font-medium hover:text-red-300 transition-colors shrink-0">
                    View <ChevronRight className="w-4 h-4 inline" />
                  </button>
                </div>
              )}

              {/* Recent products */}
              {products.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Recent Listings</span>
                    <button onClick={() => setActive("listings")} className="text-orange-400 text-xs hover:text-orange-300">View all</button>
                  </div>
                  <div className="space-y-2">
                    {products.slice(0, 3).map((p: any) => {
                      const s = STATUS[p.status] || STATUS.PENDING_VERIFICATION
                      return (
                        <Link key={p.id} href={`/product/${p.id}`}
                          className="flex items-center gap-4 bg-[#111827] border border-[#1F2D40] hover:border-[#E8772E]/30 rounded-2xl px-4 py-3 transition-all">
                          <div className="w-10 h-10 bg-[#1C2333] rounded-xl flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-slate-400" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{String(p.title || "Product")}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              <span className="text-[#9CA3AF] text-xs">{String(s.label)}</span>
                              <span className="text-[#6B7280] text-xs">·</span>
                              <span className="text-emerald-400 text-xs flex items-center gap-0.5">{String(p.voteReal)} <CheckCircle2 className="w-3 h-3 inline" /></span>
                              <span className="text-red-400 text-xs flex items-center gap-0.5">{String(p.voteFake)} <XCircle className="w-3 h-3 inline" /></span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm text-white">₹{String(p.priceInr)}</div>
                            <div className="text-[#6B7280] text-xs">{convertInrToUsdc(Number(p.priceInr) || 0, 83.33).toFixed(3)} USDC</div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LISTINGS ── */}
          {active === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">My Listings</h2>
                <div className="flex gap-2">
                  <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 rounded-xl h-9 text-sm">
                      <MessageCircle className="w-4 h-4 mr-1.5" /> Via WhatsApp
                    </Button>
                  </a>
                  <Link href="/seller-dashboard/new-product">
                    <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl h-9 text-sm">
                      <Plus className="w-4 h-4 mr-1.5" /> New Listing
                    </Button>
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-[#111827] rounded-2xl animate-pulse border border-[#1F2D40]" />)}</div>
              ) : products.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2D40] border-dashed rounded-2xl p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-[#6B7280] opacity-50" />
                  <p className="font-semibold text-lg">No listings yet</p>
                  <p className="text-[#9CA3AF] text-sm mt-1 mb-5">List your first product via web form or WhatsApp</p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link href="/seller-dashboard/new-product">
                      <Button className="bg-[#E8772E] hover:bg-[#d96a24] rounded-xl"><Plus className="w-4 h-4 mr-1.5" />List on Web</Button>
                    </Link>
                    <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 rounded-xl">
                        <MessageCircle className="w-4 h-4 mr-1.5" />List via WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((p: any) => {
                    const s = STATUS[p.status] || STATUS.PENDING_VERIFICATION
                    const total = p.voteReal + p.voteFake
                    const pct = total > 0 ? (p.voteReal / total) * 100 : 0
                    return (
                      <div key={p.id} className="bg-[#111827] border border-[#1F2D40] hover:border-[#E8772E]/30 rounded-2xl p-4 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-[#1C2333] rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden relative">
                            {p.proofMediaUrls?.[0]
                              ? <Image src={getIPFSUrl(p.proofMediaUrls[0])} alt="" fill className="object-cover" />
                              : <Package className="w-6 h-6 text-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold truncate">{String(p.title || "Product")}</div>
                                <div className="text-[#9CA3AF] text-xs mt-0.5">{String(p.category || "General")}</div>
                              </div>
                              <span className={`shrink-0 flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {String(s.label)}
                              </span>
                            </div>
                            {/* Vote bar */}
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-[#6B7280] mb-1">
                                <span>{String(p.voteReal)} real · {String(p.voteFake)} fake</span>
                                <span>{Math.round(pct)}% trust</span>
                              </div>
                              <div className="h-1 bg-[#1C2333] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl font-bold">₹{Number(p.priceInr || 0).toLocaleString()}</div>
                            <div className="text-[#6B7280] text-xs">{convertInrToUsdc(Number(p.priceInr) || 0, 83.33).toFixed(3)} USDC</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1F2D40]">
                          <Link href={`/product/${p.id}`} className="flex-1">
                            <button className="w-full text-xs text-[#9CA3AF] hover:text-white border border-[#1F2D40] hover:border-[#E8772E]/30 rounded-lg py-1.5 transition-all">View Listing</button>
                          </Link>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedQrProduct(p)}
                              className="px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white border border-[#1F2D40] hover:border-[#E8772E]/30 rounded-lg transition-all flex items-center gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              Show QR
                            </button>
                          </div>
                          {p.status === "FLAGGED" && (
                            <button className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg transition-all">
                              Resubmit
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {active === "orders" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Orders</h2>
              {loading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-[#111827] rounded-2xl animate-pulse border border-[#1F2D40]" />)}</div>
              ) : orders.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2D40] border-dashed rounded-2xl p-12 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-[#6B7280] opacity-50" />
                  <p className="font-semibold">No orders yet</p>
                  <p className="text-[#9CA3AF] text-sm mt-1">Orders appear here when buyers purchase your verified products</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o: any) => {
                    const s = STATUS[o.status] || STATUS.PAID
                    return (
                      <div key={o.id} className="bg-[#111827] border border-[#1F2D40] rounded-2xl p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{String(o.product?.title || "Product")}</span>
                              <span className={`flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {String(s.label)}
                              </span>
                            </div>
                            <div className="text-[#6B7280] text-xs mt-1 font-mono">Order #{String(o.id || "").slice(0, 8)}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-[#2775CA]">{Number(o.priceUsdc).toFixed(4)} USDC</div>
                            <div className="text-[#6B7280] text-xs">≈ ₹{Number(o.priceInr).toFixed(0)}</div>
                          </div>
                        </div>
                        {o.escrowTxId && (
                          <div className="mt-3 pt-3 border-t border-[#1F2D40] flex items-center gap-2">
                            <span className="text-[#6B7280] text-xs">Stellar escrow:</span>
                            <a href={`https://stellar.expert/explorer/testnet/tx/${o.escrowTxId}`} target="_blank" rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 text-xs flex items-center gap-1 transition-colors">
                              {o.escrowTxId.slice(0, 12)}... <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── EARNINGS ── */}
          {active === "earnings" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Earnings</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#0D1A2D] to-[#111827] border border-[#2775CA]/20 rounded-2xl p-6">
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-2">Total USDC Earned</div>
                  <div className="text-4xl font-bold font-mono text-[#2775CA]">{String(stats.usdcBalance)}</div>
                  <div className="text-[#9CA3AF] text-sm mt-1">≈ ₹{String(stats.usdcInr)}</div>
                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1 bg-[#2775CA]/10 text-[#2775CA] border border-[#2775CA]/20 hover:bg-[#2775CA]/20 rounded-xl h-9 text-sm">Withdraw to UPI</Button>
                    <Button className="flex-1 bg-[#1C2333] border border-[#1F2D40] hover:border-[#E8772E]/30 rounded-xl h-9 text-sm">To Wallet</Button>
                  </div>
                </div>
                <div className="bg-[#111827] border border-[#1F2D40] rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Stellar Wallet</div>
                  {user?.stellarWallet ? (
                    <>
                      <div className="font-mono text-sm text-[#9CA3AF] break-all bg-[#0D1321] rounded-xl p-3">
                        {String(user.stellarWallet || "")}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={copyWallet}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white border border-[#1F2D40] rounded-lg py-1.5 transition-all">
                          <Copy className="w-3 h-3" /> {String(copied ? "Copied!" : "Copy")}
                        </button>
                        <a href={`https://stellar.expert/explorer/testnet/account/${user.stellarWallet}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 border border-[#1F2D40] rounded-lg py-1.5 transition-all">
                          <ExternalLink className="w-3 h-3" /> Explorer
                        </a>
                      </div>
                    </>
                  ) : (
                    <p className="text-[#9CA3AF] text-sm">Connect your Stellar wallet to receive USDC payments.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VERIFICATION TIPS ── */}
          {active === "verification" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Verification Tips</h2>
              <p className="text-[#9CA3AF]">Community members vote on your product's authenticity. Follow these tips to get verified faster.</p>
              {[
                { icon: <Camera />, title: "Upload 3-5 clear photos", desc: "Show the product from multiple angles. Include close-ups of quality details, labels, and packaging." },
                { icon: <Video />, title: "Add a short video", desc: "A 30-second video showing the real product dramatically increases real votes. Record in good lighting." },
                { icon: <MapPin />, title: "Share GPS location", desc: "When submitting stage updates via WhatsApp, share your live location. GPS-verified updates build trust." },
                { icon: <Package />, title: "Show the packaging", desc: "Include photos of how you pack orders. Buyers trust suppliers who show care in packaging." },
                { icon: <Tag />, title: "Be specific in descriptions", desc: "Include weight, dimensions, origin, and quality grade. Vague listings get more fake votes." },
                { icon: <Zap />, title: "Update stages promptly", desc: "Text stage updates via WhatsApp as your product moves. Active suppliers rank higher in search." },
              ].map(t => (
                <div key={t.title} className="flex gap-4 bg-[#111827] border border-[#1F2D40] rounded-2xl p-4">
                  <div className="w-10 h-10 bg-[#1C2333] rounded-xl flex items-center justify-center text-xl shrink-0">{t.icon}</div>
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-[#9CA3AF] text-sm mt-0.5">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── WHATSAPP SETUP ── */}
          {active === "whatsapp" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">WhatsApp Setup</h2>
              <p className="text-[#9CA3AF]">Connect your WhatsApp to list products, submit stage updates, and receive order notifications — all without opening a browser.</p>

              <div className="bg-gradient-to-br from-[#0D2010] to-[#111827] border border-[#25D366]/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">Pramanik on WhatsApp</div>
                    <div className="text-[#9CA3AF] text-sm">+1 415 523 8886 (Twilio sandbox)</div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { step: "1", text: "Save +1 415 523 8886 as \"Pramanik\" in your contacts" },
                    { step: "2", text: "Send the join keyword to connect to the sandbox (shown in Twilio console)" },
                    { step: "3", text: "Text NEW to list your first product" },
                    { step: "4", text: "Send photos/videos anytime to add stage updates" },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{String(s.step)}</div>
                      <p className="text-sm text-[#9CA3AF]">{String(s.text)}</p>
                    </div>
                  ))}
                </div>

                <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#25D366] hover:bg-[#1db954] text-black font-bold rounded-xl h-11">
                    <MessageCircle className="w-5 h-5 mr-2" /> Open WhatsApp Now
                  </Button>
                </a>
              </div>

              <div className="bg-[#111827] border border-[#1F2D40] rounded-2xl p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-3">Quick Commands</div>
                <div className="space-y-2">
                  {[
                    { cmd: "NEW",    desc: "List a new product" },
                    { cmd: "STATUS", desc: "See your active listings and orders" },
                    { cmd: "HELP",   desc: "Show all available commands" },
                    { cmd: "[photo]", desc: "Add a stage update to your latest active product" },
                  ].map(c => (
                    <div key={c.cmd} className="flex items-center gap-3">
                      <code className="bg-[#0D1321] text-orange-400 text-xs font-mono px-2.5 py-1 rounded-lg border border-[#1F2D40] shrink-0">{c.cmd}</code>
                      <span className="text-[#9CA3AF] text-sm">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BOUNTIES ── */}
          {active === "bounties" && (
            <div className="space-y-4 text-white">
              <h2 className="text-xl font-bold uppercase tracking-wider">Bounties & Requests</h2>
              <p className="text-[#9CA3AF] text-sm leading-relaxed">Buyers are offering rewards for detailed proof of these products. Fulfill them by providing the requested information to earn rewards and boost your trust score.</p>
              
              {loading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-[#111827] rounded-2xl animate-pulse border border-[#1F2D40]" />)}</div>
              ) : bounties.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2D40] border-dashed rounded-3xl p-16 text-center">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <Coins className="w-8 h-8 text-[#6B7280] opacity-50" />
                  </div>
                  <p className="font-bold text-lg">No active bounties</p>
                  <p className="text-[#9CA3AF] text-sm mt-2 max-w-xs mx-auto">Requests appear here when buyers want specific proof for your products</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bounties.map((b: any) => {
                    const s = STATUS[b.status] || STATUS.ACTIVE
                    return (
                      <div key={b.id} className="bg-[#111827] border border-[#1F2D40] hover:border-amber-500/30 rounded-2xl p-5 transition-all group shadow-lg">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-lg group-hover:text-amber-500 transition-colors uppercase tracking-tight">{String(b.product?.title || "Product")}</span>
                              <span className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${s.cls}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot} shadow-[0_0_8px_rgba(251,191,36,0.5)]`} /> {String(s.label)}
                              </span>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-2 top-0 bottom-0 w-1 bg-amber-500/20 rounded-full" />
                              <p className="text-sm text-slate-300 bg-[#1C2333]/50 rounded-xl p-4 border border-[#1F2D40] italic leading-relaxed">
                                "{String(b.description || "")}"
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-1">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="opacity-50">BY</span>
                                <span className="text-slate-400">{String(b.issuer?.email || "User")}</span>
                              </div>
                              <span className="text-slate-700">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{String(new Date(b.createdAt).toLocaleDateString())}</span>
                              </div>
                            </div>
                          </div>
                           <div className="flex flex-col items-end shrink-0 w-full md:w-auto pt-2 md:pt-0">
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center min-w-[140px] mb-4">
                              <div className="text-2xl font-black text-amber-500 font-mono">₹{String(b.amount || 0)}</div>
                              <div className="text-[10px] text-amber-500/70 font-black uppercase tracking-widest mt-1">Reward Pool</div>
                            </div>
                            <Link href={`/product/${b.productId}`} className="w-full">
                              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black border-none rounded-xl h-11 font-black uppercase tracking-widest text-xs shadow-[0_4px_12px_rgba(245,158,11,0.3)] transition-all active:scale-95">
                                Fulfill Proof
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CUSTOMER MANAGER ── */}
          {active === "customers" && (
            <div className="space-y-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold">Customer Manager</h2>
                <p className="text-slate-400 text-xs mt-1">Manage your buyers, view order history, and handle shipment QR codes.</p>
              </div>
              <CustomerManager />
            </div>
          )}

        </main>
      </div>
      {/* QR Modal */}
      <Dialog open={!!selectedQrProduct} onOpenChange={() => setSelectedQrProduct(null)}>
        <DialogContent className="sm:max-w-md bg-[#0F172A]/95 backdrop-blur-xl border-[#1F2D40] text-white p-0 overflow-hidden rounded-3xl">
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-[#E8772E]/10 rounded-full flex items-center justify-center mb-2">
              <QrCode className="w-8 h-8 text-[#E8772E]" />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight">Product QR Code</DialogTitle>
              <DialogDescription className="text-slate-400">
                Point your camera or a scanner at this code to verify the product journey.
              </DialogDescription>
            </div>

            <div className="relative group p-4 bg-white rounded-3xl shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
               {selectedQrProduct?.qrCodeUrl ? (
                 <div className="w-64 h-64 relative">
                   <Image 
                     src={getIPFSUrl(selectedQrProduct.qrCodeUrl)} 
                     alt="Product QR" 
                     fill 
                     className="object-contain" 
                     unoptimized
                   />
                 </div>
               ) : (
                 <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded-2xl">
                   <p className="text-slate-400 text-sm">QR Code not generated</p>
                 </div>
               )}
            </div>

            <div className="w-full space-y-4 pt-4">
              <div className="bg-[#1C2333] border border-[#1F2D40] rounded-2xl p-4 text-left">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Product Details</p>
                <p className="font-semibold">{selectedQrProduct?.title}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedQrProduct?.id}</p>
              </div>

              <div className="flex gap-3">
                <a 
                  href={selectedQrProduct?.qrCodeUrl} 
                  download={`pramanik-${selectedQrProduct?.id}.png`}
                  className="flex-1"
                >
                  <button className="w-full bg-[#E8772E] hover:bg-[#ff8c42] text-white font-bold h-12 rounded-xl transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                </a>
                <button 
                  onClick={() => setSelectedQrProduct(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold h-12 rounded-xl border border-white/10 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
