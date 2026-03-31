'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/redux/store'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConnectButton } from '@/components/connect-button'
import { countryToFlag, truncateWallet, detectDeviceType, detectOS, detectBrowser } from '@/lib/qr-utils'
import dynamic from 'next/dynamic'
import { Loader2, CheckCircle2, AlertTriangle, Clock, Shield,
         Package, MapPin, Upload, ExternalLink, Activity, ShieldCheck } from 'lucide-react'
import { DisputeFormModal } from '@/components/dispute-form-modal'
import { JourneyTimelineRow } from '@/components/journey-timeline-row'
import { motion } from 'framer-motion'
import { getIPFSUrl } from '@/lib/image-utils'
import Image from 'next/image'

const JourneyMap = dynamic(() => import('@/components/journey-map'), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-[#0C0F17] rounded-[2rem] flex flex-col items-center justify-center border border-white/[0.04]">
      <Loader2 className="w-8 h-8 animate-spin text-slate-500 mb-4" />
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Initializing Map...</span>
    </div>
  ),
})

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>
  if (status === 'DELIVERED') return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Delivered</span>
  if (status === 'DISPUTED') return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Disputed</span>
  return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>
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
  const scanFired = useRef(false)

  // Fire a browser scan on page load for logging (no wallet required)
  useEffect(() => {
    if (scanFired.current) return
    scanFired.current = true
    const oid = params.orderId as string

    // 1) Fire a scan event so this visit is recorded
    fetch(`${api}/qr/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortCode: oid,
        clientTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        deviceType: detectDeviceType(navigator.userAgent),
        os: detectOS(navigator.userAgent),
        browser: detectBrowser(navigator.userAgent),
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        referrer: document.referrer || 'direct',
        isOnline: navigator.onLine,
        locationPermission: 'unavailable',
        walletConnected: wallet.isConnected,
        walletAddress: wallet.publicKey || null,
        viewType: 'delivery_confirm',
      }),
      keepalive: true,
    }).then(r => r.json()).then(result => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            fetch(`${api}/qr/scan/${result.data?.scanId}/location`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gpsLat: pos.coords.latitude,
                gpsLng: pos.coords.longitude,
                gpsAccuracy: pos.coords.accuracy,
                gpsAltitude: pos.coords.altitude,
              }),
              keepalive: true,
            })
          },
          () => {},
          { timeout: 8000, maximumAge: 60000 }
        )
      }
    }).catch(() => {})
  }, [params.orderId])

  const effectiveWallet = user?.stellarWallet || wallet.publicKey
  const isAuthenticated = !!(user?.id || wallet.isConnected)

  // Transform stage updates (factory origin) into visual scan nodes
  const stageScans = (order?.product?.stageUpdates || []).map((s: any, idx: number) => ({
    scanNumber: idx,
    serverTimestamp: s.createdAt,
    scanSource: 'SYSTEM',
    resolvedLat: s.gpsLat,
    resolvedLng: s.gpsLng,
    resolvedLocation: s.gpsAddress || s.stageName,
    scannerRole: 'supplier',
    machineEventType: s.stageName,
    ipCountryName: 'Origin'
  }))

  const realScans = order?.qrCode?.scans || []
  let displayScans = [...stageScans, ...realScans]

  // If no scans exist at all, fall back to a dummy node for timeline UX
  if (displayScans.length === 0 && order) {
    displayScans = [{
      scanNumber: 0,
      serverTimestamp: order.createdAt,
      scanSource: 'SYSTEM',
      resolvedLocation: order.product?.supplier?.location || 'Supplier Facility',
      resolvedLat: order?.product?.stageUpdates?.[0]?.gpsLat || null,
      resolvedLng: order?.product?.stageUpdates?.[0]?.gpsLng || null,
      scannerRole: 'supplier',
      machineEventType: 'Package Prepared',
      ipCountryName: 'Origin'
    }]
  }

  useEffect(() => {
    if (!effectiveWallet) return

    fetch(`${api}/delivery/${params.orderId}/delivery-view?wallet=${effectiveWallet}`)
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
  }, [effectiveWallet, params.orderId])

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
    if (!effectiveWallet) return
    setConfirming(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${api}/delivery/${params.orderId}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          walletPublicKey: effectiveWallet,
          rating: 5,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrder((prev: any) => ({
          ...prev,
          status: data.data.status || 'DELIVERED',
          buyerRating: data.data.buyerRating,
          buyerReview: data.data.buyerReview,
          releaseTxId: data.data.releaseTxId,
        }))
        setConfirmed(true)
      } else {
        console.error('Handshake failed:', data.message)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setConfirming(false)
    }
  }

  const handleUploadDisputeProof = async () => {
    if (!disputeFile || !disputeReason.trim() || !effectiveWallet) return
    setUploadingProof(true)
    try {
      const token = localStorage.getItem('accessToken')
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
      if (!ipfsData.success || !ipfsData.data?.cid) throw new Error('IPFS upload failed')

      const disputeRes = await fetch(`${api}/delivery/${params.orderId}/dispute-proof`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          walletPublicKey: effectiveWallet,
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
    <div className="min-h-screen bg-[#06080A] text-foreground pb-32">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
        {!isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[3rem] p-12 text-center max-w-2xl mx-auto mt-20">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#0C0F17] flex items-center justify-center border border-white/[0.04] shadow-inner">
              <Shield className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 text-white">Authentication Required</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Delivery confirmation requires secure verification. Please connect your wallet or login to the account used to place this order.
            </p>
            <div className="flex justify-center gap-4">
              <ConnectButton />
              <Button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl px-10 text-lg shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                Login Account
              </Button>
            </div>
          </motion.div>
        )}

        {isAuthenticated && walletMismatch && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium-card bg-red-950/20 border-red-900/40 rounded-[3rem] p-12 text-center max-w-2xl mx-auto mt-20">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-red-950/50 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4">Identity Mismatch</h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              Your connected wallet <span className="font-mono text-red-400 bg-red-500/10 px-3 py-1 rounded-lg font-bold">{truncateWallet(effectiveWallet)}</span> does not match the buyer of this shipment.
            </p>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
              Please switch accounts in Freighter or login with the correct user.
            </p>
          </motion.div>
        )}

        {isAuthenticated && loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Decrypting Order...</div>
          </div>
        )}

        {isAuthenticated && order && !walletMismatch && !loading && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div>
                <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-4 border border-blue-500/20">
                  <Package className="w-4 h-4" /> Transit Hub
                </span>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Delivery Handshake</h1>
              </div>
              <div className="shrink-0">
                <StatusBadge status={order.status} />
              </div>
            </div>

            {/* Product summary */}
            <div className="premium-card rounded-[2rem] p-8 border border-white/[0.04] shadow-2xl flex flex-col sm:flex-row gap-8 items-start relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
              
              <div className="w-32 h-32 rounded-2xl bg-[#0C0F17] flex items-center justify-center border border-white/[0.04] shrink-0 overflow-hidden relative">
                {order.product.proofMediaUrls?.[0] ? (
                  <Image src={getIPFSUrl(order.product.proofMediaUrls[0])} alt="" fill className="object-cover" />
                ) : <Package className="w-10 h-10 text-slate-700" />}
              </div>
              
              <div className="flex-1 min-w-0 pr-8">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Item En Route</div>
                <h2 className="text-3xl font-bold truncate text-white mb-2">{order.product.title}</h2>
                {order.product.description && <p className="text-sm text-slate-400 mb-3 italic">"{order.product.description}"</p>}
                <p className="text-slate-400 text-base mb-6">{order.product.supplier?.name || "Verified Supplier"} <span className="mx-2 text-slate-600">•</span> {order.product.supplier?.location || "Global"}</p>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-[#0C0F17] border border-white/[0.06] rounded-xl px-5 py-3 shadow-inner inline-flex items-center gap-2">
                     <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Escrow</span>
                     <span className="font-mono text-emerald-400 font-bold text-lg">{Number(order.priceUsdc).toFixed(2)} USDC</span>
                  </div>
                  <div className="bg-[#0C0F17] border border-white/[0.06] rounded-xl px-5 py-3 shadow-inner inline-flex items-center gap-2">
                     <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Qty</span>
                     <span className="font-mono text-white font-bold text-lg">{order.quantity || 1}</span>
                  </div>
                  {order.shippingAddress && (
                    <div className="bg-[#0C0F17] border border-white/[0.06] rounded-xl px-5 py-3 shadow-inner flex flex-col justify-center min-w-[200px]">
                       <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-400"/> Delivery Dest.</span>
                       <span className="text-sm font-bold text-slate-300 truncate max-w-xs">{order.shippingFullName}</span>
                       <span className="text-xs text-slate-400 truncate max-w-xs">{order.shippingCity}, {order.shippingState}</span>
                    </div>
                  )}
                </div>
                {order.shippingAddress && (
                  <div className="mt-4 text-xs text-slate-500 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04] leading-relaxed">
                    <span className="font-bold text-slate-400">Full Address:</span> {order.shippingAddress}, {order.shippingCity}, {order.shippingState} - {order.shippingPincode} ({order.shippingCountry})
                    <br/>
                    <span className="font-bold text-slate-400">Contact:</span> {order.shippingPhone}
                  </div>
                )}
              </div>
            </div>

            {/* ── MAP & TIMELINE ── */}
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <div className="premium-card rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden h-[400px]">
                <div className="flex justify-between items-center mb-6 z-10">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-500" /> Verification Nodes
                  </h3>
                  {order.qrCode?.totalScans > 0 && (
                    <span className="bg-[#0C0F17] border border-white/[0.06] px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 shadow-inner">
                      {order.qrCode.totalScans} Checkpoints
                    </span>
                  )}
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.06] relative z-0">
                  {displayScans.some((s: any) => typeof s.resolvedLat === 'number' && typeof s.resolvedLng === 'number') ? (
                    <JourneyMap scans={displayScans} />
                  ) : displayScans.length > 0 ? (
                    <JourneyMap scans={[{ ...displayScans[0], resolvedLat: 28.6139, resolvedLng: 77.2090, resolvedLocation: 'Supplier Origin (Estimated)' }, ...displayScans.slice(1)]} />
                  ) : (
                    <div className="w-full h-full bg-[#0C0F17] flex flex-col items-center justify-center space-y-4">
                      <Activity className="w-10 h-10 text-slate-700" />
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center px-4">
                        Awaiting Geographic Scan
                        <p className="text-xs text-slate-600 mt-2 font-normal नॉर्मल normal-case">GPS coordinates will appear here once the package is registered at a transit hub.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="premium-card rounded-[2rem] p-6 lg:p-8 flex flex-col h-[400px]">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Event Log
                </h3>
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-0 relative">
                  {displayScans.length > 0 ? (
                    displayScans.map((scan: any, i: number) => (
                      <JourneyTimelineRow key={i} scan={scan} isLast={i === displayScans.length - 1} />
                    ))
                  ) : (
                    <div className="text-center py-20">
                      <p className="text-slate-500 text-sm font-semibold">Timeline will populate once supplier dispatches.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── ACTION BLOCKS ── */}
            <div className="mt-8 space-y-6">
              {!order.deliveryConfirmedAt && order.status !== 'COMPLETED' && (
                <div className="premium-card rounded-[2rem] p-8 md:p-10 border border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">Package Arrived?</h3>
                      <p className="text-slate-400 leading-relaxed text-lg">
                        Execute the handshake to confirm physical reception. This unlocks a <strong className="text-white">72-hour audit phase</strong> where escrow remains frozen while you inspect the goods.
                      </p>
                    </div>
                    <Button
                      onClick={handleConfirmDelivery}
                      disabled={confirming}
                      className="w-full md:w-auto h-16 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl px-10 text-lg shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all active:scale-95 border-0"
                    >
                      {confirming ? (
                        <><Loader2 className="w-6 h-6 animate-spin mr-3" /> Verifying tx...</>
                      ) : (
                        <><CheckCircle2 className="w-6 h-6 mr-3" /> Execute Digital Handshake</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Observation Window */}
              {order.status === 'DELIVERED' && order.proofDeadlineAt && !order.buyerProofCid && (
                <div className={`premium-card rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden transition-all duration-1000 ${
                  order.hoursRemaining < 6 ? 'border-red-500/30 shadow-red-500/10' : 'border-amber-500/30 shadow-amber-500/10'
                }`}>
                  <div className={`absolute top-0 right-0 w-[500px] h-[500px] blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 transition-all duration-1000 ${
                    order.hoursRemaining < 6 ? 'bg-red-500/10' : 'bg-amber-500/10'
                  }`} />
                  
                  <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 bg-[#0C0F17] border border-white/[0.06] px-5 py-2.5 rounded-2xl shadow-inner mb-6">
                        <Clock className={`w-5 h-5 ${order.hoursRemaining < 6 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                        <span className={`font-mono text-xl font-bold ${order.hoursRemaining < 6 ? 'text-red-400' : 'text-amber-400'}`}>
                          {timeRemaining || 'Calculating...'}
                        </span>
                      </div>
                      <h3 className="text-3xl font-extrabold text-white mb-4">Inspection Phase Active</h3>
                      <p className="text-slate-300 text-lg leading-relaxed mb-6">
                        Assets are currently locked in smart escrow. Inspect your item immediately. If you detect counterfeit or damage, raise a cryptographic dispute before the timer expires. <strong>Once expired, funds release permanently.</strong>
                      </p>
                      <Button
                        onClick={() => setShowDisputeForm(true)}
                        className="h-14 px-8 rounded-2xl font-bold bg-[#0C0F17] text-white border border-red-500/30 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 transition-all shadow-inner"
                      >
                        <AlertTriangle className="w-5 h-5 mr-3" /> Freeze Escrow & Dispute
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expired / Completed */}
              {order.proofWindowExpired && !order.buyerProofCid && order.status !== 'COMPLETED' && (
                <div className="premium-card rounded-[2rem] p-8 border border-white/[0.04] bg-zinc-900/50 flex items-start gap-4">
                   <Shield className="w-8 h-8 text-slate-500 shrink-0" />
                   <div>
                     <h3 className="text-xl font-bold text-white mb-2">Window Terminated</h3>
                     <p className="text-slate-400">The 72-hour inspection phase is over. The Soroban contract is executing final settlement. No disputes can be filed.</p>
                   </div>
                </div>
              )}

              {order.status === 'COMPLETED' && (
                <div className="premium-card rounded-[3rem] p-16 text-center shadow-emerald-500/10 border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
                  
                  <div className="relative z-10 w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 className="font-extrabold text-4xl md:text-5xl text-white mb-6 tracking-tight">Contract Fulfilled</h3>
                  <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                    The item was accepted and the inspection phase cleared. The smart contract has successfully dispersed {Number(order.priceUsdc).toFixed(2)} USDC to the supplier.
                  </p>
                  
                  {order.releaseTxId && (
                    <a href={`https://stellar.expert/explorer/testnet/tx/${order.releaseTxId}`} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-3 bg-[#0C0F17] border border-white/[0.06] hover:border-emerald-500/30 px-6 py-4 rounded-2xl hover:bg-white/[0.02] transition-colors shadow-inner text-white group">
                      <span className="text-sm font-bold uppercase tracking-widest text-slate-500 group-hover:text-emerald-400 transition-colors">On-Chain Settlement Log</span>
                      <ExternalLink className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </a>
                  )}
                </div>
              )}

              {/* Disputed */}
              {order.buyerProofCid && (
                <div className="premium-card rounded-[2.5rem] p-10 border-red-500/30 shadow-2xl relative overflow-hidden border">
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                      <h3 className="text-3xl font-extrabold text-white">Escrow Frozen</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      <div className="bg-[#0C0F17] rounded-2xl p-6 border border-white/[0.04] shadow-inner">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Cryptographic Claim</div>
                        <p className="text-slate-300 text-lg italic leading-relaxed">"{order.buyerDisputeReason}"</p>
                      </div>
                      <div className="bg-[#0C0F17] rounded-2xl p-6 border border-white/[0.04] shadow-inner">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">IPFS Proof Uploaded</div>
                        <a href={`https://gateway.pinata.cloud/ipfs/${order.buyerProofCid}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white flex items-center gap-2 group p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/10 transition-colors cursor-pointer">
                          <ExternalLink className="w-5 h-5 text-red-400" />
                          <span className="font-mono text-sm break-all">{order.buyerProofCid}</span>
                        </a>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-2xl text-sm">
                      <ShieldCheck className="w-5 h-5" /> Smart contract holdings ({Number(order.priceUsdc).toFixed(2)} USDC) are securely locked pending decentralized DAO validation.
                    </div>
                  </div>
                </div>
              )}
            </div>

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
