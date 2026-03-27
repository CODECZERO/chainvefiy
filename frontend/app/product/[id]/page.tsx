"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { useParams } from "next/navigation"
import type { RootState } from "@/lib/redux/store"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { CheckCircle2, XCircle, Clock, MapPin, ExternalLink, MessageCircle, ShieldCheck, Package, Lightbulb, Coins } from "lucide-react"
import Link from "next/link"
import { PaymentModal } from "@/components/payment-modal"
import { BountyModal } from "@/components/bounty-modal"
import { SubmitProofModal } from "@/components/submit-proof-modal"
import { BuyerProfileModal } from "@/components/buyer-profile-modal"
import { convertInrToUsdc, getUSDCInrRate } from "@/lib/exchange-rates"
import { getBountiesByProduct } from "@/lib/api-service"
import { useToast } from "@/components/ui/use-toast"
import { toast as toastFn } from "@/components/ui/use-toast"

const PAYMENT_CURRENCIES = ["XLM", "USDC", "BTC", "ETH", "EUR", "GBP"]

export default function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState("USDC")
  const [showPayment, setShowPayment] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showBountyModal, setShowBountyModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)
  const [selectedBounty, setSelectedBounty] = useState<any>(null)
  const [buyerProfile, setBuyerProfile] = useState<any>(null)
  const [bounties, setBounties] = useState<any[]>([])
  const [usdcInr, setUsdcInr] = useState(83.33)
  const { isAuthenticated, user } = useSelector((s: RootState) => s.userAuth)
  const isSupplier = isAuthenticated && user?.role === "SUPPLIER"
  const { toast } = useToast()

  useEffect(() => {
    loadProduct()
  }, [id])

  useEffect(() => {
    getUSDCInrRate().then(setUsdcInr).catch(() => {})
  }, [])

  const loadProduct = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`)
      const data = await res.json()
      setProduct(data.data)

      // Load bounties
      const bountyRes = await getBountiesByProduct(id as string)
      if (bountyRes.success) {
        setBounties(bountyRes.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const checkProfileAndBuy = async () => {
    if (!isAuthenticated) {
      toast({ title: "Auth Required", description: "Please connect your wallet first." })
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/buyer`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      })
      const data = await res.json()
      if (data.success && data.data) {
        setBuyerProfile(data.data)
        setShowModal(true)
      } else {
        setShowProfileModal(true)
      }
    } catch (e) {
      setShowProfileModal(true)
    }
  }

  const handleProfileSave = async (data: any) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/buyer`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      if (json.success) {
        setBuyerProfile(json.data)
        setShowProfileModal(false)
        setShowModal(true)
      } else {
        throw new Error(json.message)
      }
    } catch (e: any) {
      toast({ title: "Save Failed", description: e.message || "Failed to save profile", variant: "destructive" })
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="h-8 bg-muted rounded w-1/2" />
      </div>
    </div>
  )

  if (!product) return null

  const total = product.voteReal + product.voteFake
  const realPct = total > 0 ? Math.round((product.voteReal / total) * 100) : 0
  const usdcPrice =
    typeof product.priceUsdc === "number" && product.priceUsdc > 0
      ? product.priceUsdc
      : convertInrToUsdc(Number(product.priceInr) || 0, usdcInr)
  const isVerified = product.status === "VERIFIED"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* ── Left: Media + Details ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Proof Gallery */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="h-72 bg-muted flex items-center justify-center text-7xl overflow-hidden relative">
                {product.proofMediaUrls?.[activeImg] ? (
                  <div className="relative w-full h-full">
                    <Image 
                      src={product.proofMediaUrls[activeImg]} 
                      alt={product.title || "Product Image"} 
                      fill
                      className="object-cover"
                      priority
                      onError={(e) => {
                        (e.target as any).src = 'https://placehold.co/600x400?text=Image+Not+Found';
                      }}
                    />
                  </div>
                ) : <Package className="w-20 h-20 text-muted-foreground opacity-60" />}
              </div>
              {product.proofMediaUrls?.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {product.proofMediaUrls.map((_: string, i: number) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`w-14 h-14 rounded-lg bg-muted shrink-0 border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* QR Code - Only Supplier */}
            {product.qrCodeUrl && user?.role === 'SUPPLIER' && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold mb-3">Product QR Code</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Suppliers: print this QR and attach to your product packaging.
                  Buyers scan it to see the verified journey.
                </p>
                <div className="flex items-center gap-6">
                  <div className="relative w-32 h-32 rounded-xl border border-border bg-background overflow-hidden items-center justify-center flex">
                    <Image 
                      src={product.qrCodeUrl} 
                      alt="QR Code" 
                      fill
                      className="object-contain"
                      unoptimized
                      onError={(e) => {
                        (e.target as any).src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '');
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <a href={product.qrCodeUrl} download={`pramanik-${product.id}.png`}>
                      <Button variant="outline" className="rounded-xl w-full text-sm">
                        Download QR Code
                      </Button>
                    </a>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Check out ${product.title || "this product"} on Pramanik: ` + (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/product/' + product.id)}`}
                      target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="rounded-xl w-full text-sm">
                        Share via WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Title + Status */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold">{String(product.title || "")}</h1>
                <span className={`shrink-0 flex items-center gap-1 border rounded-full px-3 py-1 text-sm font-semibold ${
                  isVerified ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}>
                  {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 leading-relaxed">{String(product.description || "")}</p>
              <div className="inline-block mt-3 bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
                {String(product.category || "General")}
              </div>
            </div>

            {/* Supplier Card */}
            <Link href={`/supplier/${product.supplier?.id}`}>
              <div className="flex items-center gap-4 bg-card border border-border hover:bg-accent rounded-2xl p-4 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground">
                  {String(product.supplier?.name?.[0] || "S")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{String(product.supplier?.name || "Supplier")}</span>
                    {product.supplier?.isVerified && <ShieldCheck className="w-4 h-4 text-orange-400" />}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-3 h-3" /> {String(product.supplier?.location || "Unknown")}
                  </div>
                  {product.supplier?.stellarWallet && (
                    <div className="mt-1 text-[10px] font-mono text-slate-500 break-all bg-slate-500/5 px-2 py-0.5 rounded">
                      {product.supplier.stellarWallet}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-primary font-bold">{String(product.supplier?.trustScore || 0)}</div>
                  <div className="text-muted-foreground text-xs">Trust Score</div>
                </div>
              </div>
            </Link>

            {/* Verification */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Community Verification</h3>
                <Button 
                  onClick={() => setShowBountyModal(true)}
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Request More Proof
                </Button>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> {String(product.voteReal || 0)} real
                </span>
                <span className="flex items-center gap-2 text-red-400 text-sm">
                  <XCircle className="w-4 h-4" /> {String(product.voteFake || 0)} fake
                </span>
                <span className="text-muted-foreground text-sm ml-auto">{String(realPct)}% trust rate</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${realPct}%` }} />
              </div>
              {isVerified && (
                <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified by {product.voteReal} community members
                </p>
              )}
            </div>

            {/* Active Bounties */}
            {bounties?.filter(b => b.status === "ACTIVE").length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  Active Bounties
                </h3>
                <div className="grid gap-3">
                  {bounties.filter(b => b.status === "ACTIVE").map((b) => (
                    <div key={b.id} className="bg-muted/30 border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{String(b.description || "")}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Issued by {b.issuer?.email || (b.issuerWallet ? `${b.issuerWallet.slice(0, 6)}...${b.issuerWallet.slice(-4)}` : "Anonymous")}
                          </p>
                          {/* Solver Action */}
                          {(user?.role === "SUPPLIER" || (user?.role === "BUYER" && (user as any)?.isVerified)) && (
                            <button 
                              onClick={() => {
                                setSelectedBounty(b)
                                setShowProofModal(true)
                              }}
                              className="text-[10px] text-primary hover:underline font-bold uppercase transition-colors"
                            >
                              Submit Proof
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{Number(b.amount || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground mr-1">Reward</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage Timeline */}
            {product.stageUpdates?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold mb-4">Product Journey</h3>
                <div className="space-y-4">
                  {product.stageUpdates.map((s: any, i: number) => (
                    <div key={s.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                        {i < product.stageUpdates.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="font-medium">{String(s.stageName || "Update")}</div>
                        {s.note && <p className="text-muted-foreground text-sm mt-1">{String(s.note)}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(s.createdAt).toLocaleString()}</span>
                          {(s.gpsLat && s.gpsLng) && (
                            <a
                              href={`https://www.google.com/maps?q=${encodeURIComponent(`${s.gpsLat},${s.gpsLng}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <MapPin className="w-3 h-3" />
                              {String(s.gpsAddress ? s.gpsAddress : "View location")}
                            </a>
                          )}
                          {s.stellarTxId && (
                            <a href={`https://stellar.expert/explorer/testnet/tx/${s.stellarTxId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-orange-400 hover:text-orange-300">
                              <ExternalLink className="w-3 h-3" /> Stellar TX
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Payment Box ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-card border border-border rounded-2xl p-6 space-y-5">
              <div>
                <div className="text-3xl font-bold font-mono text-primary">₹{Number(product.priceInr || 0).toLocaleString()}</div>
                <div className="text-muted-foreground text-sm mt-1">
                  ≈ {(selectedCurrency === "USDC" ? (Number(usdcPrice) || 0) : (Number(product.priceInr || 0) / 10)).toFixed(2)} {selectedCurrency} settled in escrow
                </div>
              </div>

              {/* Currency selector */}
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Pay with</div>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_CURRENCIES.map((c) => (
                    <button key={c} onClick={() => setSelectedCurrency(c)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        selectedCurrency === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Escrow notice */}
              <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 inline mb-0.5" /> Payment is held in{" "}
                <span className="text-foreground font-medium">Stellar Soroban escrow</span> and released to supplier only after you confirm delivery.
              </div>

              {!isSupplier ? (
                <Button onClick={checkProfileAndBuy} className="w-full rounded-xl h-11 font-semibold">
                  Buy Now with {selectedCurrency}
                </Button>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-primary text-center font-medium">
                  Suppliers cannot buy products. Visit your dashboard to manage your own listings.
                </div>
              )}

              {product.stellarTxId && (
                <a href={`https://stellar.expert/explorer/testnet/tx/${product.stellarTxId}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-3 h-3" /> View receipt on Stellar
                </a>
              )}
            </div>
          </div>

        </div>
      </div>
      {product && (
        <PaymentModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          product={{
            id: product.id,
            title: product.title,
            priceInr: Number(product.priceInr),
            priceUsdc: usdcPrice,
            supplier: product.supplier,
          }}
          shippingDetails={buyerProfile}
          initialCurrency={selectedCurrency as any}
        />
      )}
      {product && (
        <BountyModal
          isOpen={showBountyModal}
          onClose={() => {
            setShowBountyModal(false)
            loadProduct() // Refresh bounties
          }}
          product={product}
        />
      )}
      {product && (
        <SubmitProofModal
          isOpen={showProofModal}
          onClose={() => setShowProofModal(false)}
          bounty={selectedBounty}
          onSuccess={() => loadProduct()}
        />
      )}
      <BuyerProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        onSave={handleProfileSave}
        initialData={buyerProfile}
      />
    </div>
  )
}
