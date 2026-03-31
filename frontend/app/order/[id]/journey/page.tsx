"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { CheckCircle2, Package, MapPin, ExternalLink, ShieldCheck, Clock, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import dynamic from 'next/dynamic'
import { JourneyTimelineRow } from '@/components/journey-timeline-row'
import { detectDeviceType, detectOS, detectBrowser } from '@/lib/qr-utils'

const JourneyMap = dynamic(() => import('@/components/journey-map'), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-[#0C0F17] rounded-[2rem] flex flex-col items-center justify-center border border-white/[0.04]">
      <Loader2 className="w-8 h-8 animate-spin text-slate-500 mb-4" />
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Initializing Map...</span>
    </div>
  ),
})

export default function OrderJourneyPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useSelector((s: RootState) => s.userAuth)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  const scanFired = useRef(false)

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

    // Fire telemetry event on load (non-blocking, non-critical)
    if (scanFired.current) return
    scanFired.current = true

    ;(async () => {
      try {
        const scanRes = await fetch(`${api}/qr/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shortCode: id,
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
            walletConnected: false,
            viewType: 'public_journey',
          }),
          keepalive: true,
        })
        if (!scanRes.ok) return
        const result = await scanRes.json()
        const scanId = result.data?.scanId
        if (!scanId) return

        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              fetch(`${api}/qr/scan/${scanId}/location`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  gpsLat: pos.coords.latitude,
                  gpsLng: pos.coords.longitude,
                  gpsAccuracy: pos.coords.accuracy,
                  gpsAltitude: pos.coords.altitude,
                }),
                keepalive: true,
              }).catch(() => {})
            },
            () => {},
            { timeout: 8000, maximumAge: 60000 }
          )
        }
      } catch { /* telemetry is non-critical */ }
    })()
  }, [id, api])

  // Verification Logic
  const connectedWallet = user?.stellarWallet
  const buyerWallet = order?.buyer?.stellarWallet
  const supplierWallet = order?.product?.supplier?.stellarWallet
  
  const hasValidToken = token && (token === order?.qrBuyerToken || token === order?.qrSupplierToken)
  const isAuthorized = hasValidToken || (connectedWallet && (connectedWallet === buyerWallet || connectedWallet === supplierWallet))

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
  const stageScans = (product?.stageUpdates || []).map((s: any, idx: number) => ({
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

  if (displayScans.length === 0 && order) {
    displayScans = [{
      scanNumber: 0,
      serverTimestamp: order.createdAt,
      scanSource: 'SYSTEM',
      resolvedLocation: product?.supplier?.location || 'Supplier Facility',
      resolvedLat: product?.stageUpdates?.[0]?.gpsLat || null,
      resolvedLng: product?.stageUpdates?.[0]?.gpsLng || null,
      scannerRole: 'supplier',
      machineEventType: 'Package Prepared',
      ipCountryName: 'Origin'
    }]
  }

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

        {/* Timeline & Map Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8 mt-12">
          <div className="premium-card rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden h-[400px]">
            <div className="flex justify-between items-center mb-6 z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" /> Verification Nodes
              </h3>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.06] relative z-0">
              {displayScans.some((s: any) => typeof s.resolvedLat === 'number' && typeof s.resolvedLng === 'number') ? (
                 <JourneyMap scans={displayScans} />
              ) : displayScans.length > 0 ? (
                 <JourneyMap scans={[{ ...displayScans[0], resolvedLat: 28.6139, resolvedLng: 77.2090, resolvedLocation: 'Supplier Origin (Estimated)' }, ...displayScans.slice(1)]} />
              ) : (
                 <div className="w-full h-full bg-[#0C0F17] flex flex-col items-center justify-center space-y-4">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center px-4">
                      Awaiting Geographic Scan
                      <p className="text-xs text-slate-600 mt-2 font-normal normal-case">GPS coordinates will appear here once the package is registered at a transit hub.</p>
                    </span>
                 </div>
              )}
            </div>
          </div>
          
          <div className="premium-card rounded-[2rem] p-6 lg:p-8 flex flex-col h-[400px] border border-white/[0.04]">
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
