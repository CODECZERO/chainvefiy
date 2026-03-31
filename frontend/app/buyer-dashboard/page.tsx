"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useWallet } from "@/lib/wallet-context"
import { WalletRequirement } from "@/components/wallet-requirement"
import {
  Package, ScanLine, ArrowRight, Lock, Loader2,
  ShoppingCart, Wallet, Clock, CheckCircle2, XCircle,
  Eye, ExternalLink, QrCode, AlertTriangle, ChevronRight,
  RefreshCw, Shield, TrendingUp, Star, Copy, BarChart2, Coins, Download, X
} from "lucide-react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import Image from "next/image"
import { getIPFSUrl } from "@/lib/image-utils"

const NAV = [
  { id: "orders",       label: "My Orders",        icon: ShoppingCart },
  { id: "tracking",     label: "Active Tracking",   icon: ScanLine },
  { id: "completed",    label: "Completed",          icon: CheckCircle2 },
  { id: "bounties",     label: "Bounties",           icon: Coins },
]

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:              { label: "Pending",    cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",       dot: "bg-zinc-400" },
  PAID:                 { label: "Paid",       cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",       dot: "bg-blue-400" },
  SHIPPED:              { label: "Shipped",    cls: "bg-purple-500/10 text-purple-400 border-purple-500/20", dot: "bg-purple-400" },
  DELIVERED:            { label: "Delivered",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",    dot: "bg-amber-400" },
  COMPLETED:            { label: "Completed",  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  DISPUTED:             { label: "Disputed",   cls: "bg-red-500/10 text-red-400 border-red-500/20",          dot: "bg-red-400" },
}

export default function BuyerDashboard() {
  const { publicKey } = useWallet()
  const { user } = useSelector((s: RootState) => s.userAuth)
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

  // Computed stats
  const paidOrders = orders.filter(o => o.status === "PAID" || o.status === "SHIPPED")
  const deliveredOrders = orders.filter(o => o.status === "DELIVERED")
  const completedOrders = orders.filter(o => o.status === "COMPLETED")
  const disputedOrders = orders.filter(o => o.status === "DISPUTED")
  const totalSpent = orders.reduce((s, o) => s + Number(o.priceUsdc || 0), 0)
  const activeTracking = [...paidOrders, ...deliveredOrders]

  // Filter by active tab
  const filteredOrders = active === "tracking" ? activeTracking
    : active === "completed" ? completedOrders
    : orders

  if (loading && !user && !publicKey) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (user && user.role !== "BUYER") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Buyer Access Only</h1>
          <p className="text-muted-foreground mb-8">
            This dashboard is for buyers. Please use your buyer account or switch roles.
          </p>
          <Link href="/"><Button variant="outline" className="rounded-xl">Go Home</Button></Link>
        </div>
      </div>
    )
  }

  if (!user?.id && !publicKey) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-10">
          <WalletRequirement fallbackMessage="Please connect your wallet to view your order history." />
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
          {/* Buyer card */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xl font-bold shrink-0 text-white">
                {String(user?.email || publicKey || "B")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{String(user?.email?.split("@")[0] || "Wallet User")}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-muted-foreground text-xs truncate">Buyer Account</span>
                </div>
              </div>
            </div>
            {/* Wallet display */}
            {(user?.stellarWallet || publicKey) && (
              <div className="mt-3 bg-[#0D1321] rounded-xl p-2.5 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-mono text-[#9CA3AF] truncate flex-1">
                  {String(user?.stellarWallet || publicKey || "").slice(0, 8)}...{String(user?.stellarWallet || publicKey || "").slice(-4)}
                </span>
                <button onClick={copyWallet} className="text-[#6B7280] hover:text-white transition-colors shrink-0">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
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
              {n.id === "tracking" && activeTracking.length > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full">{String(activeTracking.length)}</span>
              )}
              {n.id === "orders" && orders.length > 0 && (
                <span className="ml-auto bg-blue-500/20 text-blue-400 text-xs font-bold px-1.5 py-0.5 rounded-full">{String(orders.length)}</span>
              )}
            </button>
          ))}

          {/* Total Spent Card */}
          <div className="mt-auto bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2">Total Spent</div>
            <div className="text-2xl font-bold font-mono text-blue-400">{totalSpent.toFixed(4)}</div>
            <div className="text-muted-foreground text-xs mt-0.5">USDC · {String(orders.length)} orders</div>
            {(user?.stellarWallet || publicKey) && (
              <a href={`https://stellar.expert/explorer/testnet/account/${user?.stellarWallet || publicKey}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 border border-[#1F2D40] rounded-lg py-1.5 mt-3 transition-all">
                <ExternalLink className="w-3 h-3" /> View on Explorer
              </a>
            )}
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">

          {/* Mobile tab bar */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 lg:hidden">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setActive(n.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  active === n.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground border border-transparent hover:bg-accent"
                }`}>
                <n.icon className="w-3.5 h-3.5" /> {n.label}
              </button>
            ))}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Orders",     value: orders.length,           color: "text-blue-400",    bg: "from-blue-500/5",    icon: ShoppingCart },
              { label: "Active Tracking",  value: activeTracking.length,   color: "text-amber-400",   bg: "from-amber-500/5",   icon: ScanLine },
              { label: "Completed",        value: completedOrders.length,  color: "text-emerald-400", bg: "from-emerald-500/5",  icon: CheckCircle2 },
              { label: "USDC Spent",       value: totalSpent.toFixed(2),   color: "text-[#2775CA]",   bg: "from-[#2775CA]/5",   icon: Wallet },
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

          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {active === "orders" ? "All Orders" : active === "tracking" ? "Active Tracking" : active === "completed" ? "Completed Orders" : "Bounties"}
            </h2>
            <button onClick={loadOrders} className="p-2 text-[#6B7280] hover:text-white border border-[#1F2D40] rounded-xl hover:border-primary/30 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Disputed Alert */}
          {disputedOrders.length > 0 && (
            <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-red-300">{String(disputedOrders.length)} order{disputedOrders.length > 1 ? "s" : ""} under dispute</div>
                <div className="text-red-400/70 text-sm">Our team is reviewing. You'll be notified of the resolution.</div>
              </div>
            </div>
          )}

          {/* Bounties tab */}
          {active === "bounties" ? (
            <div className="space-y-4">
              <p className="text-[#9CA3AF] text-sm">Create bounties on products you've purchased to request additional proof from the supplier community.</p>
              <div className="bg-[#111827] border border-[#1F2D40] border-dashed rounded-2xl p-12 text-center">
                <Coins className="w-12 h-12 mx-auto mb-3 text-[#6B7280] opacity-50" />
                <p className="font-semibold">Coming Soon</p>
                <p className="text-[#9CA3AF] text-sm mt-1">Bounty creation for verified buyers will be available here.</p>
              </div>
            </div>
          ) : (
            /* Orders List */
            <>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-[#111827] rounded-2xl animate-pulse border border-[#1F2D40]" />)}</div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-[#111827] border border-[#1F2D40] border-dashed rounded-2xl p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-[#6B7280] opacity-50" />
                  <p className="font-semibold text-lg">
                    {active === "tracking" ? "No active shipments" : active === "completed" ? "No completed orders yet" : "No orders yet"}
                  </p>
                  <p className="text-[#9CA3AF] text-sm mt-1 mb-5">
                    {active === "tracking" ? "Orders you purchase will appear here while in transit." : "Browse the marketplace to find verified products."}
                  </p>
                  {active !== "tracking" && (
                    <Link href="/marketplace">
                      <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl">
                        <ShoppingCart className="w-4 h-4 mr-1.5" /> Browse Marketplace
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order: any) => {
                    const s = STATUS[order.status] || STATUS.PENDING
                    return (
                      <div key={order.id} className="bg-[#111827] border border-[#1F2D40] hover:border-blue-500/30 rounded-2xl p-5 transition-all">
                        <div className="flex items-start gap-4">
                          {/* Product image */}
                          <div className="w-16 h-16 bg-[#1C2333] rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative border border-[#1F2D40]">
                            {order.product?.proofMediaUrls?.[0]
                              ? <Image src={getIPFSUrl(order.product.proofMediaUrls?.[0])} alt="" fill className="object-cover" />
                              : <Package className="w-6 h-6 text-slate-500" />}
                          </div>
                          {/* Order details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold truncate">{String(order.product?.title || "Product")}</div>
                                <div className="text-[#9CA3AF] text-xs mt-0.5">
                                  {String(order.product?.supplier?.name || "Supplier")} · #{String(order.id || "").slice(0, 8)}
                                </div>
                              </div>
                              <span className={`shrink-0 flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {String(s.label)}
                              </span>
                            </div>
                            {/* Price row */}
                            <div className="flex items-center gap-4 mt-2.5">
                              <div className="flex items-center gap-1.5 bg-[#1C2333] rounded-lg px-3 py-1.5">
                                <span className="text-[#6B7280] text-xs">Amount</span>
                                <span className="font-mono font-bold text-white text-sm">₹{Number(order.priceInr || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#2775CA] font-mono text-xs font-bold">{Number(order.priceUsdc || 0).toFixed(4)} USDC</span>
                              </div>
                              <span className="text-[#6B7280] text-xs ml-auto">{String(new Date(order.createdAt).toLocaleDateString())}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action bar */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1F2D40]">
                          {(order.status === "PAID" || order.status === "SHIPPED" || order.status === "DELIVERED") && (
                            <button
                              onClick={() => window.open(`/delivery/confirm/${order.id}`, "_blank")}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg py-2 transition-all">
                              <ScanLine className="w-3.5 h-3.5" />
                              {order.status === "DELIVERED" ? "Inspect & Confirm" : "Confirm Receipt"}
                            </button>
                          )}
                          {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
                            <>
                              <button
                                onClick={() => window.open(`/proof/${order.id}?viewType=logistics`, "_blank")}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-lg py-2 transition-all">
                                <Shield className="w-3.5 h-3.5" /> Event Logs
                              </button>
                              <button
                                onClick={() => window.open(`/order/${order.id}/journey`, "_blank")}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg py-2 transition-all">
                                <ScanLine className="w-3.5 h-3.5" /> Track Journey
                              </button>
                            </>
                          )}
                          {(order.status === "COMPLETED" && order.deliveryCertCid) && (
                            <button
                              onClick={() => window.open(`/proof/${order.id}`, "_blank")}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg py-2 transition-all">
                              <CheckCircle2 className="w-3.5 h-3.5" /> View Certificate
                            </button>
                          )}
                          <Link href={`/product/${order.productId}`} className={order.status === "PENDING" ? "flex-1" : ""}>
                            <button className="w-full flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white border border-[#1F2D40] hover:border-blue-500/30 rounded-lg py-2 px-3 transition-all">
                              <Eye className="w-3.5 h-3.5" /> View Product
                            </button>
                          </Link>
                          {order.escrowTxId && (
                            <a href={`https://stellar.expert/explorer/testnet/tx/${order.escrowTxId}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 border border-[#1F2D40] rounded-lg py-2 px-3 transition-all">
                              <ExternalLink className="w-3 h-3" /> TX
                            </a>
                          )}
                        </div>

                        {/* QR Section for active orders */}
                        {(order.status === "PAID" || order.status === "SHIPPED") && order.qrCodeUrl && (
                          <div 
                            className="mt-3 flex items-center gap-4 bg-[#0D1321] rounded-xl p-3 border border-[#1F2D40] cursor-pointer hover:border-blue-500/30 transition-colors"
                            onClick={() => setSelectedQr(order.qrCodeUrl)}
                          >
                            <div className="w-16 h-16 bg-white rounded-lg p-1 shrink-0 relative overflow-hidden">
                              <Image src={order.qrCodeUrl} alt="QR" fill className="object-contain p-1" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                                  <QrCode className="w-3.5 h-3.5" /> Delivery QR Code
                                </div>
                                <span className="text-xs text-blue-400/50 flex items-center gap-1"><Download className="w-3 h-3" /> Expand</span>
                              </div>
                              <p className="text-[#6B7280] text-xs mt-1 leading-relaxed">
                                Show this QR to the supplier upon delivery for on-chain verification.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* QR Code Modal Overlay */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedQr(null)}>
          <div className="bg-[#0C0F17] border border-[#1F2D40] rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedQr(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-[#1C2333] rounded-full p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" /> Secure Handshake
            </h3>
            <p className="text-slate-400 text-sm mb-6">Let the supplier scan this code to complete the delivery and start your inspection timer.</p>
            <div className="bg-white p-4 rounded-2xl mx-auto w-64 h-64 relative mb-6">
              <Image src={selectedQr} alt="Delivery QR Code Large" fill className="object-contain p-2" />
            </div>
            <a href={selectedQr} download="chainverify-delivery-qr.png" className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors">
              <Download className="w-4 h-4" /> Download Image
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
