'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/redux/store'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConnectButton } from '@/components/connect-button'
import { countryToFlag, truncateWallet } from '@/lib/qr-utils'
import dynamic from 'next/dynamic'
import { Loader2, CheckCircle2, AlertTriangle, Clock, Shield,
         Package, MapPin, Upload, ExternalLink } from 'lucide-react'
import { DisputeFormModal } from '@/components/dispute-form-modal'
import { JourneyTimelineRow } from '@/components/journey-timeline-row'

// Leaflet must be loaded client-side only — no SSR
const JourneyMap = dynamic(() => import('@/components/journey-map'), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  ),
})

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</Badge>
  if (status === 'DELIVERED') return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Delivered</Badge>
  if (status === 'DISPUTED') return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Disputed</Badge>
  return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">{status}</Badge>
}

export default function DeliveryConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const wallet = useSelector((s: RootState) => s.wallet)
  const { user } = useSelector((s: RootState) => s.userAuth)
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [walletMismatch, setWalletMismatch] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeFile, setDisputeFile] = useState<File | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

  useEffect(() => {
    if (!wallet.isConnected || !wallet.publicKey) return

    fetch(`${api}/delivery/${params.orderId}/delivery-view?wallet=${wallet.publicKey}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setOrder(data.data.order)
          setWalletMismatch(false)
        } else if (data.message?.includes('Wallet does not match')) {
          setWalletMismatch(true)
        }
      })
      .catch((e) => console.error('Error fetching order', e))
      .finally(() => setLoading(false))
  }, [wallet.isConnected, wallet.publicKey, params.orderId])

  useEffect(() => {
    if (!order?.proofDeadlineAt) return

    const tick = () => {
      const now = Date.now()
      const deadline = new Date(order.proofDeadlineAt).getTime()
      const diff = deadline - now
      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${h}h ${m}m ${s}s`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [order?.proofDeadlineAt])

  const handleConfirmDelivery = async () => {
    if (!wallet.publicKey || !user?.id) return
    setConfirming(true)
    try {
      const res = await fetch(`${api}/delivery/${params.orderId}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPublicKey: wallet.publicKey,
          rating: 5,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrder((prev: any) => ({
          ...prev,
          ...data.data,
          status: 'DELIVERED',
        }))
        setConfirmed(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setConfirming(false)
    }
  }

  const handleUploadDisputeProof = async () => {
    if (!disputeFile || !disputeReason.trim() || !wallet.publicKey) return
    setUploadingProof(true)
    try {
      // 1. Upload file to IPFS via backend
      const formData = new FormData()
      formData.append('file', disputeFile)
      formData.append('orderId', params.orderId as string)
      formData.append('type', 'buyer_dispute_proof')
      const ipfsRes = await fetch(`${api}/ipfs/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const ipfsData = await ipfsRes.json()
      if (!ipfsData.success || !ipfsData.data?.cid) {
        throw new Error('IPFS upload failed')
      }

      // 2. Submit dispute with CID
      const disputeRes = await fetch(`${api}/delivery/${params.orderId}/dispute-proof`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPublicKey: wallet.publicKey,
          proofCid: ipfsData.data.cid,
          disputeReason: disputeReason.trim(),
        }),
      })
      const disputeData = await disputeRes.json()
      if (disputeData.success) {
        setOrder((prev: any) => ({ ...prev, status: 'DISPUTED', buyerProofCid: ipfsData.data.cid }))
        setShowDisputeForm(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploadingProof(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── WALLET GATE ────────────────────────────────────────────── */}
        {!wallet.isConnected && (
          <Card className="p-8 text-center bg-zinc-900 border-zinc-800">
            <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet to Continue</h2>
            <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
              Only the wallet that placed this order can confirm delivery or view its tracking.
              Please connect your Stellar wallet to verify your identity.
            </p>
            <div className="flex justify-center">
              <ConnectButton label="Connect Wallet to Confirm" />
            </div>
          </Card>
        )}

        {/* ── WALLET MISMATCH ────────────────────────────────────────── */}
        {wallet.isConnected && walletMismatch && !loading && (
          <Card className="p-8 text-center bg-red-950/40 border-red-900">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Wrong Wallet</h2>
            <p className="text-zinc-300 text-sm mb-3">
              The currently connected wallet <span className="font-mono text-white bg-black/50 px-2 py-0.5 rounded">{truncateWallet(wallet.publicKey!)}</span> does
              not match the buyer wallet on this order.
            </p>
            <p className="text-zinc-500 text-xs">
              Please switch to the wallet you used when placing this order.
            </p>
          </Card>
        )}

        {/* ── LOADING ────────────────────────────────────────────────── */}
        {wallet.isConnected && loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        )}

        {/* ── MAIN CONTENT — only shown when wallet matches ──────────── */}
        {wallet.isConnected && order && !walletMismatch && !loading && (
          <>
            <h1 className="text-2xl font-bold mb-6">Delivery Confirmation</h1>

            {/* Product summary */}
            <Card className="p-5 bg-zinc-900 border-zinc-800">
              <div className="flex gap-4 items-start">
                {order.product.proofMediaUrls?.[0] ? (
                  <img
                    src={order.product.proofMediaUrls[0]}
                    alt={order.product.title}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-black/50"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{order.product.title}</h2>
                  <p className="text-zinc-400 text-sm truncate">{order.product.supplier.name} · {order.product.supplier.location}</p>
                  <div className="flex gap-3 mt-2 items-center">
                    <span className="font-mono text-emerald-400 text-sm font-semibold">
                      {Number(order.priceUsdc).toFixed(2)} USDC
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            </Card>

            {/* ── JOURNEY MAP ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Package Journey Map
                </h3>
                {order.qrCode && order.qrCode.totalScans > 0 && (
                  <div className="flex gap-3 text-xs text-zinc-500 font-medium">
                    <span>{order.qrCode.totalScans} checkpoints</span>
                    <span className="hidden sm:inline">
                      {order.qrCode.countriesReached?.map((c: string) => countryToFlag(c)).join(' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Journey map — Leaflet */}
              {order.qrCode?.scans?.length > 0 ? (
                <JourneyMap scans={order.qrCode.scans} />
              ) : (
                <div className="h-48 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center text-center px-4">
                  <Package className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">No checkpoints recorded yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">Updates will appear here as the package is scanned.</p>
                </div>
              )}

              {/* Journey timeline */}
              {order.qrCode?.scans?.length > 0 && (
                <div className="mt-5 space-y-0 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4 ml-1">Timeline</h4>
                  <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {order.qrCode.scans.map((scan: any, i: number) => (
                      <JourneyTimelineRow key={i} scan={scan} isLast={i === order.qrCode.scans.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── CONFIRM DELIVERY BUTTON — only before confirmation ─────── */}
            {!order.deliveryConfirmedAt && order.status !== 'COMPLETED' && (
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleConfirmDelivery}
                  disabled={confirming}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
                >
                  {confirming ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Confirming Reception...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5 mr-2" /> I Received This Package</>
                  )}
                </Button>
                <div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-400 text-sm">
                    Confirming delivery opens a <strong className="text-white">72-hour window</strong> for you to inspect the item. 
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    You can upload photo proof of damage or fakes during this window to freeze escrow. Otherwise, payment releases to the supplier.
                  </p>
                </div>
              </div>
            )}

            {/* ── PROOF WINDOW WARNING — shown after buyer confirms ─────── */}
            {order.status === 'DELIVERED' && order.proofDeadlineAt && !order.buyerProofCid && (
              <div className={`rounded-xl border p-5 shadow-lg ${
                order.hoursRemaining < 6
                  ? 'bg-red-950/40 border-red-900 shadow-red-900/10'
                  : 'bg-amber-950/20 border-amber-900/50 shadow-amber-900/5'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    order.hoursRemaining < 6 ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-500'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-lg mb-1 ${
                      order.hoursRemaining < 6 ? 'text-red-400' : 'text-amber-500'
                    }`}>
                      {timeRemaining ? `${timeRemaining} to inspect` : 'Checking deadline...'}
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                      Your payment is currently held securely in escrow. Please inspect your item. 
                      If it is damaged, counterfeit, or incorrect, you must report it before the timer runs out.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 text-xs text-zinc-400 border border-white/5 mb-4">
                      After <strong className="text-zinc-200">72 hours</strong> from confirmation, payment is automatically released and refunds become impossible.
                    </div>
                    <Button
                      onClick={() => setShowDisputeForm(true)}
                      variant="outline"
                      className="border-amber-700/50 text-amber-500 hover:bg-amber-900/30 hover:text-amber-400 hover:border-amber-600 transition-colors bg-[#0A0F1A]"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Report an Issue
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROOF WINDOW EXPIRED ───────────────────────────────────── */}
            {order.proofWindowExpired && !order.buyerProofCid && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 flex items-start gap-3">
                <Shield className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">Observation Window Closed</p>
                  <p className="text-zinc-400 text-sm">
                    The 72-hour proof window has ended. The smart contract has permanently released payment to the supplier. No further disputes or refunds are possible.
                  </p>
                </div>
              </div>
            )}

            {/* ── DISPUTE PROOF SUBMITTED ────────────────────────────────── */}
            {order.buyerProofCid && (
              <Card className="p-6 bg-red-950/20 border-red-900/50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-white">Dispute Under Review</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Your Report</p>
                    <p className="text-zinc-300 text-sm italic">"{order.buyerDisputeReason}"</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Attached Evidence</p>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${order.buyerProofCid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md transition-colors font-mono"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      IPFS Proof ({order.buyerProofCid.slice(0, 8)}...)
                    </a>
                  </div>
                  <p className="text-emerald-400 text-xs font-medium pt-2 border-t border-zinc-800">
                    Escrow is frozen holding your {Number(order.priceUsdc).toFixed(2)} USDC until a community DAO vote resolves this claim.
                  </p>
                </div>
              </Card>
            )}

            {/* ── COMPLETED ──────────────────────────────────────────────── */}
            {order.status === 'COMPLETED' && (
              <Card className="p-6 text-center bg-gradient-to-b from-emerald-950/40 to-zinc-900 border-emerald-900/50">
                <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="font-bold text-xl text-white mb-2">Order Complete</h3>
                <p className="text-zinc-400 text-sm max-w-md mx-auto mb-5">
                  The delivery was successfully confirmed and the observation window has passed. Smart contract escrow has been released.
                </p>
                
                {order.releaseTxId && (
                  <div className="flex justify-center">
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${order.releaseTxId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-900 px-4 py-2 rounded-lg hover:bg-emerald-900 transition-colors inline-flex items-center gap-2"
                    >
                      ⛓️ Escrow Release Tx <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </Card>
            )}

            {/* ── DISPUTE FORM MODAL ─────────────────────────────────────── */}
            {showDisputeForm && (
              <DisputeFormModal
                onClose={() => setShowDisputeForm(false)}
                onSubmit={handleUploadDisputeProof}
                disputeReason={disputeReason}
                setDisputeReason={setDisputeReason}
                disputeFile={disputeFile}
                setDisputeFile={setDisputeFile}
                uploading={uploadingProof}
                timeRemaining={timeRemaining}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
