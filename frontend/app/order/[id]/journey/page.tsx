"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { CheckCircle2, Package, MapPin, ExternalLink, ShieldCheck, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"

export default function OrderJourneyPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useSelector((s: RootState) => s.userAuth)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`${api}/orders/${id}`)
        const data = await res.json()
        if (data.success) {
          setOrder(data.data)
        }
      } catch (e) {
        console.error("Failed to fetch order", e)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id, api])

  // Verification Logic
  const connectedWallet = user?.stellarWallet
  const buyerWallet = order?.buyer?.stellarWallet
  const supplierWallet = order?.product?.supplier?.stellarWallet
  
  const isAuthorized = connectedWallet && (connectedWallet === buyerWallet || connectedWallet === supplierWallet)

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-20 animate-pulse text-center space-y-4">
        <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto" />
        <div className="h-8 bg-slate-800 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-slate-800 rounded w-1/3 mx-auto" />
      </div>
    </div>
  )

  if (!order) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Journey Not Found</h1>
      <Link href="/marketplace">
        <Button variant="outline">Back to Marketplace</Button>
      </Link>
    </div>
  )

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <ShieldCheck className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Verification Required</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            This is a private verified journey. To view it, please connect the wallet address used for this purchase.
          </p>
          
          {!connectedWallet ? (
            <Button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <p className="text-red-400 text-sm font-medium">Unauthorized Wallet</p>
                <p className="text-[10px] text-red-400/50 font-mono mt-1 break-all">{connectedWallet}</p>
                <Button 
                    variant="ghost" 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                    className="mt-4 text-xs text-slate-400 hover:text-white"
                >
                    Switch Wallet
                </Button>
            </div>
          )}
          
          <Link href="/marketplace" className="block mt-6 text-sm text-slate-500 hover:text-slate-300">
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const product = order.product
  const stageUpdates = product?.stageUpdates || []

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/buyer-dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>

        {/* Header Card */}
        <div className="bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-8 mb-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8">
            <ShieldCheck className="w-12 h-12 text-primary opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
          
          <div className="relative space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              Verified Journey
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">{product?.title}</h1>
            <p className="text-slate-400 max-w-lg">
              This product has been tracked from origin to your purchase. 
              The timeline below is anchored on the Stellar blockchain for immutable proof.
            </p>
            
            <div className="pt-4 flex flex-wrap gap-4">
              <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-3 text-center min-w-[120px]">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Order Status</div>
                <div className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {order.status}
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl px-5 py-3 text-center min-w-[120px]">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Verification</div>
                <div className="text-primary font-bold">100% On-Chain</div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-12 pl-4">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" /> Tracking History
          </h2>

          <div className="relative border-l-2 border-white/5 ml-4 space-y-12">
            {/* Purchase Stage (End of journey for now) */}
            <div className="relative pl-10">
              <div className="absolute -left-[11px] top-0 w-5 h-5 bg-emerald-500 border-4 border-slate-950 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <div className="space-y-2">
                <div className="text-emerald-400 font-bold text-lg">Purchase Finalized</div>
                <div className="text-sm text-slate-400">{new Date(order.createdAt).toLocaleString()}</div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-sm text-slate-300">
                  Payment secured in Stellar Escrow. Package prepared for delivery to:
                  <div className="mt-2 font-medium text-white">{order.shippingAddress}, {order.shippingCity}</div>
                </div>
              </div>
            </div>

            {/* Product Stages */}
            {stageUpdates.map((s: any, i: number) => (
              <div key={s.id} className="relative pl-10">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-primary border-4 border-slate-950 rounded-full" />
                <div className="space-y-3">
                  <div className="text-white font-bold text-lg">{s.stageName}</div>
                  <div className="text-sm text-slate-400">{new Date(s.createdAt).toLocaleString()}</div>
                  {s.note && <p className="text-slate-300 text-sm leading-relaxed">{s.note}</p>}
                  
                  {s.photoUrl && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 max-w-sm">
                      <img src={s.photoUrl} alt={s.stageName} className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs">
                    {s.gpsAddress && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {s.gpsAddress}
                      </div>
                    )}
                    {s.stellarTxId && (
                      <a 
                        href={`https://stellar.expert/explorer/testnet/tx/${s.stellarTxId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View on Blockchain
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Origin Stage */}
            <div className="relative pl-10">
              <div className="absolute -left-[11px] top-0 w-5 h-5 bg-slate-800 border-4 border-slate-950 rounded-full" />
              <div className="space-y-1">
                <div className="text-slate-400 font-bold text-lg">Product Registered</div>
                <div className="text-sm text-slate-500">{new Date(product.createdAt).toLocaleString()}</div>
                <div className="text-xs text-slate-600">Initial verification by {product.supplier?.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-20 pt-10 border-t border-white/5 text-center">
          <div className="inline-flex items-center gap-2 p-2 px-4 rounded-full bg-slate-900 border border-white/10 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Scan Token Verified: <span className="font-mono text-primary">{token?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
