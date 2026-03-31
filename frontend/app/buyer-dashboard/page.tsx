"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWallet } from "@/lib/wallet-context"
import { WalletRequirement } from "@/components/wallet-requirement"
import {
  Package, ScanLine, ArrowRight, Lock, Loader2,
  ShoppingCart, Wallet, Clock, CheckCircle2, XCircle,
  Eye, ExternalLink, QrCode, AlertTriangle, ChevronRight,
  RefreshCw, Shield, Zap, TrendingUp, Star, Copy, BarChart2, Coins, Download, X, PieChart as PieIcon
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from 'next/dynamic'
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import Image from "next/image"
import { getIPFSUrl } from "@/lib/image-utils"

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const RechartsTooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })

const COLORS = ['#2775CA', '#F7931A', '#627EEA', '#82ca9d', '#8884d8'];

const NAV = [
  { id: "orders",       label: "My Orders",        icon: ShoppingCart },
  { id: "tracking",     label: "Active Tracking",   icon: ScanLine },
  { id: "completed",    label: "History",            icon: CheckCircle2 },
  { id: "bounties",     label: "Bounty Board",       icon: Coins },
]

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:              { label: "Awaiting Payment", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",       dot: "bg-zinc-400" },
  PAID:                 { label: "Paid",             cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",       dot: "bg-blue-400" },
  SHIPPED:              { label: "In Transit",       cls: "bg-purple-500/10 text-purple-400 border-purple-500/20", dot: "bg-purple-400" },
  DELIVERED:            { label: "Arrived",          cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",    dot: "bg-amber-400" },
  COMPLETED:            { label: "Verified",         cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  DISPUTED:             { label: "Disputed",         cls: "bg-red-500/10 text-red-400 border-red-500/20",          dot: "bg-red-400" },
}

export default function BuyerDashboard() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useSelector((s: RootState) => s.userAuth)
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, authLoading, router])

  const { publicKey } = useWallet()
  const [active, setActive] = useState("orders")
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedQr, setSelectedQr] = useState<string | null>(null)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  useEffect(() => { loadOrders() }, [user?.id, publicKey])

  const loadOrders = async () => {
    if (!user?.id && !publicKey) { setLoading(false); return }
    setLoading(true)
    try {
      const query = user?.id ? `buyerId=${user.id}` : `stellarWallet=${publicKey}`
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const response = await fetch(`${api}/orders/my-orders?${query}`, {
        credentials: 'include',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      })
      const data = await response.json()
      if (response.ok) setOrders(data.data || [])
    } catch (err) {
      console.error('[BuyerDashboard] Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyWallet = () => {
    const wallet = user?.stellarWallet || publicKey
    if (wallet) navigator.clipboard.writeText(wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Computed data
  const activeOrders = orders.filter(o => o.status === "PAID" || o.status === "SHIPPED" || o.status === "DELIVERED")
  const totalSpent = orders.reduce((s, o) => s + Number(o.priceUsdc || 0), 0)
  
  const spendingData = orders
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce((acc: any[], order) => {
      const date = new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      const last = acc[acc.length - 1]
      const total = (last?.total || 0) + Number(order.priceUsdc || 0)
      acc.push({ date, amount: Number(order.priceUsdc || 0), total })
      return acc
    }, [])

  const currencyDistribution = orders.reduce((acc: any[], order) => {
     const curr = order.currency || "USDC"
     const existing = acc.find(c => c.name === curr)
     if (existing) existing.value += Number(order.priceUsdc || 0)
     else acc.push({ name: curr, value: Number(order.priceUsdc || 0) })
     return acc
  }, [])

  const filteredOrders = active === "tracking" ? activeOrders
    : active === "completed" ? orders.filter(o => o.status === "COMPLETED")
    : orders

  if (loading && !user && !publicKey) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-[#2775CA]" />
        </div>
      </div>
    )
  }

  if (user && user.role !== "BUYER") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <Lock className="w-16 h-16 text-slate-700 mx-auto mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-tighter">Purchase Account Only</h1>
          <p className="text-slate-500 mt-2 mb-8">This dashboard tracks buyer history. Please sign in with a buyer account.</p>
          <Link href="/"><Button variant="outline" className="rounded-2xl h-12 px-8 uppercase tracking-widest text-[10px] font-black">Go Home</Button></Link>
        </div>
      </div>
    )
  }

  if (!user?.id && !publicKey) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-10">
          <WalletRequirement fallbackMessage="Please connect your wallet to view your purchase history." />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#020408] text-slate-400 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Premium Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-3 p-6 h-full border-r border-white/[0.04] bg-[#0A0D14]/20 backdrop-blur-sm">
          {/* Buyer Profile Card */}
          <div className="premium-card bg-[#0A0D14]/80 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2775CA]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                {String(user?.email || publicKey || "B")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-black text-white text-lg truncate tracking-tight">{String(user?.email?.split("@")[0] || "Buyer Account")}</div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[#2775CA] font-black text-[9px] uppercase tracking-widest">
                  <Shield className="w-3 h-3" /> Certified Buyer
                </div>
              </div>
            </div>

            {/* Spend Meter */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                <span>Trust Reputation</span>
                <span className="text-blue-400">98%</span>
              </div>
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: "98%" }} className="h-full bg-blue-500" />
              </div>
            </div>

            {/* Wallet Address Widget */}
            {(user?.stellarWallet || publicKey) && (
              <div className="mt-6 bg-[#0C0F17] border border-white/[0.04] rounded-xl p-3 flex items-center gap-3 group/wallet">
                <Wallet className="w-3.5 h-3.5 text-slate-500 group-hover/wallet:text-blue-400 transition-colors" />
                <span className="text-[10px] font-mono text-slate-500 truncate flex-1 uppercase">
                  {String(user?.stellarWallet || publicKey || "").slice(0, 10)}...{String(user?.stellarWallet || publicKey || "").slice(-6)}
                </span>
                <button onClick={copyWallet} className="text-slate-600 hover:text-white transition-colors">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 py-4 scrollbar-hide">
            {NAV.map(n => (
              <button 
                key={n.id} 
                onClick={() => setActive(n.id)}
                className={`w-full group flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all relative overflow-hidden ${
                  active === n.id
                    ? "text-white bg-[#2775CA]/10 border border-[#2775CA]/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                {active === n.id && <motion.div layoutId="nav-glow-buyer" className="absolute inset-0 bg-blue-600/5" />}
                <n.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active === n.id ? "text-blue-400" : "text-slate-500"}`} />
                <span className="relative z-10">{n.label}</span>
                {n.id === "tracking" && activeOrders.length > 0 && (
                   <span className="ml-auto bg-amber-500/20 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded-lg border border-amber-500/20">{activeOrders.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Cumulative Spend Widget */}
          <div className="premium-card bg-[#0A0D14]/40 border border-white/[0.06] rounded-[2rem] p-6 shadow-xl mt-auto">
            <div className="flex items-center justify-between mb-4">
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cumulative Spend</div>
               <TrendingUp className="w-4 h-4 text-emerald-400 opacity-50" />
            </div>
            <div className="text-2xl font-black text-white tracking-tighter tabular-nums">
              {totalSpent.toFixed(2)} <span className="text-[10px] text-blue-500 uppercase ml-1">USDC</span>
            </div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Stellar Escrow Network</div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar p-8">
           <AnimatePresence mode="wait">
             <motion.div
               key={active}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.3 }}
               className="space-y-8"
             >
               {/* Header Area */}
               <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase tracking-[-0.05em]">
                      {active === "orders" ? "My Inventory" : active === "tracking" ? "Live Logistics" : active === "completed" ? "Order History" : "Bounty Board"}
                    </h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Certified Product Lifecycle</p>
                  </div>
                  <button onClick={loadOrders} className="p-3 text-slate-500 hover:text-white bg-[#0A0D14]/50 border border-white/[0.06] rounded-2xl transition-all active:scale-95 shadow-lg">
                    <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                  </button>
               </div>

               {/* Overhaul Analytics Row */}
               {active === "orders" && (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
                    {/* Spending chart */}
                    <div className="lg:col-span-8 premium-card bg-[#0A0D14]/80 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
                       <div className="flex items-center justify-between mb-8">
                          <div>
                             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Spend Velocity</h3>
                             <div className="text-2xl font-black text-white tracking-tighter mt-1">Cumulative Investment</div>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full bg-[#2775CA] shadow-blue-500/50 shadow-lg" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spend</span>
                          </div>
                       </div>
                       <div className="h-[240px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={spendingData}>
                                <defs>
                                   <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#2775CA" stopOpacity={0.4}/>
                                      <stop offset="100%" stopColor="#2775CA" stopOpacity={0}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#475569" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} dx={-10} />
                                <RechartsTooltip 
                                   contentStyle={{backgroundColor: '#0A0D14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px'}}
                                />
                                <Area type="monotone" dataKey="total" stroke="#2775CA" strokeWidth={4} fillOpacity={1} fill="url(#spendGrad)" />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* Asset Distribution */}
                    <div className="lg:col-span-4 premium-card bg-[#0A0D14]/80 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Asset Allocation</h3>
                       <div className="flex-1 relative min-h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie 
                                  data={currencyDistribution.length > 0 ? currencyDistribution : [{name: 'Empty', value: 1}]}
                                  innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none"
                                >
                                   {currencyDistribution.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                   {currencyDistribution.length === 0 && <Cell fill="#1F2D40" />}
                                </Pie>
                                <RechartsTooltip contentStyle={{backgroundColor: '#0A0D14', borderRadius: '12px'}} />
                             </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Yield</span>
                              <span className="text-xl font-black text-white">{totalSpent.toFixed(0)}</span>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3 mt-6">
                           {currencyDistribution.map((c, i) => (
                             <div key={c.name} className="flex items-center gap-2 bg-[#0C0F17]/50 p-2.5 rounded-xl border border-white/[0.04]">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                                <div className="text-[10px] font-black uppercase text-slate-400">{c.name}</div>
                             </div>
                           ))}
                       </div>
                    </div>
                 </div>
               )}

               {/* Orders Grid */}
               {active === "bounties" ? (
                 <div className="premium-card bg-[#0A0D14]/80 border-2 border-dashed border-white/[0.08] rounded-[2.5rem] p-20 text-center">
                    <Coins className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">Bounty Issuance Pending</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">Verified buyers will soon be able to issue custom proof-of-authenticity bounties on purchased items.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6 pb-20">
                    {filteredOrders.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-white/[0.04] rounded-[2.5rem]">
                         <Package className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                         <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">No matching transactions found</p>
                      </div>
                    ) : (
                      filteredOrders.map((o: any) => {
                        const s = STATUS[o.status] || STATUS.PAID
                        return (
                          <motion.div 
                            key={o.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="premium-card bg-[#0A0D14]/60 backdrop-blur-xl border border-white/[0.08] hover:border-[#2775CA]/30 rounded-[2.5rem] p-8 transition-all group relative overflow-hidden"
                          >
                             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                             <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
                                {/* Left Side: Product */}
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                   <div className="w-24 h-24 bg-[#0C121E] rounded-[2rem] border border-white/[0.08] relative overflow-hidden group-hover:scale-105 transition-transform">
                                      {o.product?.proofMediaUrls?.[0] ? (
                                        <Image src={getIPFSUrl(o.product.proofMediaUrls[0])} alt="" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                      ) : (
                                        <Package className="w-10 h-10 text-slate-700 absolute inset-0 m-auto" />
                                      )}
                                   </div>
                                   <div className="min-w-0">
                                      <div className="flex items-center gap-4 mb-2">
                                         <h4 className="text-2xl font-black text-white tracking-tighter uppercase truncate">{o.product?.title || "Target Asset"}</h4>
                                         <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${s.cls}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot} inline-block mr-2`} /> {s.label}
                                         </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                         <span className="text-slate-400">NODE ID: {o.id.slice(0, 12)}</span>
                                         <span className="text-slate-800">•</span>
                                         <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-500" /> {o.product?.supplier?.name || "Verified Merchant"}</span>
                                      </div>
                                   </div>
                                </div>

                                {/* Center: Price */}
                                <div className="hidden lg:flex flex-col items-center border-x border-white/[0.04] px-12 shrink-0">
                                   <div className="text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(39,117,202,0.2)]">
                                      {o.priceUsdc} <span className="text-sm text-[#2775CA]">USDC</span>
                                   </div>
                                   <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Escrowed Settlement</div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
                                   {(o.status === "PAID" || o.status === "SHIPPED" || o.status === "DELIVERED") && (
                                     <Button 
                                       onClick={() => window.open(`/delivery/confirm/${o.id}`, "_blank")}
                                       className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl h-14 px-8 shadow-blue-500/20 shadow-xl active:scale-95 transition-all"
                                     >
                                        <ScanLine className="w-4 h-4 mr-2" /> Inspect & Sign 
                                     </Button>
                                   )}
                                   {(o.status === "SHIPPED" || o.status === "DELIVERED" || o.status === "COMPLETED") && (
                                      <div className="flex gap-2">
                                         <Button onClick={() => window.open(`/order/${o.id}/journey`, "_blank")} className="flex-1 bg-white/5 border border-white/[0.06] hover:bg-white/10 rounded-xl h-12 uppercase text-[9px] font-black font-mono tracking-widest transition-all">Node Journey</Button>
                                         <Button onClick={() => window.open(`/proof/${o.id}?viewType=logistics`, "_blank")} className="flex-1 bg-white/5 border border-white/[0.06] hover:bg-white/10 rounded-xl h-12 uppercase text-[9px] font-black font-mono tracking-widest transition-all">Event Mesh</Button>
                                      </div>
                                   )}
                                   {o.status === "COMPLETED" && o.deliveryCertCid && (
                                      <Button onClick={() => window.open(`/proof/${o.id}`, "_blank")} className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl h-12 uppercase text-[9px] font-black tracking-widest hover:bg-emerald-500/20 transition-all">
                                         View Digital Passport <Download className="w-3.5 h-3.5 ml-2" />
                                      </Button>
                                   )}
                                   {o.status === "PENDING" && (
                                      <Link href={`/product/${o.productId}`} className="w-full">
                                         <Button className="w-full bg-white text-black rounded-xl h-14 uppercase text-[10px] font-black tracking-widest hover:bg-slate-200 active:scale-95 transition-all outline-none">Complete Payment</Button>
                                      </Link>
                                   )}
                                </div>
                             </div>

                             {/* QR Segment for active delivery */}
                             {(o.status === "PAID" || o.status === "SHIPPED") && o.qrCodeUrl && (
                               <motion.div 
                                 whileHover={{ scale: 1.01 }}
                                 onClick={() => setSelectedQr(o.qrCodeUrl)}
                                 className="mt-6 bg-[#0C121E]/80 border border-white/[0.04] rounded-2xl p-4 flex items-center gap-6 cursor-pointer hover:border-blue-500/30 transition-all"
                               >
                                  <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0 group-hover:scale-110 transition-transform">
                                     <Image src={o.qrCodeUrl} alt="QR" fill className="object-contain p-1" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="flex justify-between items-center mb-1">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Delivery Handshake Protocol</div>
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Click to Expand</span>
                                     </div>
                                     <p className="text-slate-500 text-xs leading-relaxed max-w-md">Present this cryptographic key to the merchant representative during physical handover to unlock the final settlement phase.</p>
                                  </div>
                               </motion.div>
                             )}
                          </motion.div>
                        )
                      })
                    )}
                 </div>
               )}
             </motion.div>
           </AnimatePresence>
        </main>
      </div>

      {/* ── Visual QR Modal Extension ── */}
      <AnimatePresence>
        {selectedQr && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020408]/90 backdrop-blur-xl" onClick={() => setSelectedQr(null)}>
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-[#0A0D14] border border-white/[0.08] rounded-[3rem] p-12 max-w-md w-full text-center relative shadow-3xl"
               onClick={e => e.stopPropagation()}
             >
                <button onClick={() => setSelectedQr(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-white/5 rounded-full p-2.5 transition-all">
                  <X className="w-6 h-6" />
                </button>
                <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
                   <QrCode className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Delivery Token</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Cryptographic Handshake Key</p>
                
                <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl relative group mb-10">
                   <div className="absolute inset-0 bg-blue-500/5 blur-3xl pointer-events-none" />
                   <div className="w-full h-64 relative bg-white rounded-2xl overflow-hidden">
                      <Image src={selectedQr} alt="QR Master" fill className="object-contain p-2" />
                   </div>
                </div>

                <a href={selectedQr} download="pramanik-handshake.png" className="block w-full">
                   <Button className="w-full bg-white text-black h-16 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 shadow-xl transition-all active:scale-95">
                      <Download className="w-5 h-5 mr-3" /> Save to Photos
                   </Button>
                </a>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
