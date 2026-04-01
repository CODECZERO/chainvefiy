"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import { detectDeviceType, detectOS, detectBrowser, countryToFlag, truncateWallet } from "@/lib/qr-utils"
import { ExternalLink, Shield, MapPin, Clock, Wifi, WifiOff, AlertTriangle, Package, CheckCircle2, Activity, Eye } from "lucide-react"

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  return (
    <div className="bg-[#111827] border border-[#1F2D40] rounded-xl p-4 text-center print:border-gray-300 print:bg-white">
      <div className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-1">{label}</div>
      <div className="text-lg font-bold text-white print:text-black flex items-center justify-center gap-1">
        {icon && <span>{icon}</span>}
        {value}
      </div>
    </div>
  )
}

// ─── View Banner ────────────────────────────────────────────────────────────
const VIEW_BANNERS: Record<string, { text: string; color: string } | null> = {
  logistics: { text: "Logistics / Customs View", color: "text-amber-400 bg-amber-900/30 border-amber-800" },
  origin: { text: "Origin Verification", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  minimal: { text: "Simplified View", color: "text-zinc-400 bg-zinc-900 border-zinc-800" },
  default: null,
}

// ─── Scan Count Banner ──────────────────────────────────────────────────────
function ScanCountBanner({ totalScans, status }: { totalScans: number; status?: string }) {
  if (status === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-2.5 print:hidden">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-400 font-medium">Order completed — permanent delivery receipt</span>
      </div>
    )
  }
  if (totalScans >= 10) {
    return (
      <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-800/40 rounded-xl px-4 py-2.5 print:hidden">
        <Eye className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-purple-400 font-medium">Widely verified — scanned by {totalScans} independent parties</span>
      </div>
    )
  }
  if (totalScans >= 4) {
    return (
      <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-2.5 print:hidden">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-blue-400 font-medium">Journey in progress — {totalScans} checkpoints recorded</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 print:hidden">
      <Package className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400 font-medium">Journey just started — product recently shipped</span>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function ProofPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const searchParams = useSearchParams()
  const wallet = useSelector((s: RootState) => s.wallet)
  const scanFired = useRef(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanToken, setScanToken] = useState<string | null>(null) // ephemeral — component state only
  const [journey, setJourney] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const viewType = searchParams.get("viewType") || searchParams.get("view") || "default"

  // Effect 1: Fire scan + fetch journey when ?qr= param is present (external QR scan)
  useEffect(() => {
    const shortCode = searchParams.get("qr")
    if (!shortCode || scanFired.current) return
    scanFired.current = true

    const scanData = {
      shortCode,
      clientTimestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      deviceType: detectDeviceType(navigator.userAgent),
      os: detectOS(navigator.userAgent),
      browser: detectBrowser(navigator.userAgent),
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connectionType: (navigator as any).connection?.effectiveType || "unknown",
      referrer: document.referrer || "direct",
      isOnline: navigator.onLine,
      locationPermission: "unavailable",
      walletConnected: wallet.isConnected,
      walletAddress: wallet.publicKey || null,
      viewType,
    }

    fetch(`${api}/qr/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scanData),
      keepalive: true,
    })
      .then(r => r.json())
      .then(result => {
        setScanResult(result.data)
        if (result.data?.scanToken) setScanToken(result.data.scanToken)

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              fetch(`${api}/qr/scan/${result.data?.scanId}/location`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
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
            { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true }
          )
        }
      })
      .catch(() => {})

    fetch(`${api}/qr/${shortCode}/journey`)
      .then(r => r.json())
      .then(d => { setJourney(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [searchParams])

  // Effect 2: Fetch journey by orderId when no ?qr= param (Event Logs / Dashboard links)
  useEffect(() => {
    const shortCode = searchParams.get("qr")
    if (shortCode) return // Already handled by Effect 1
    if (!orderId) return

    setLoading(true)
    fetch(`${api}/qr/${orderId}/journey`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setJourney(d.data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [orderId, searchParams])

  const qr = journey?.qrCode
  const scans = journey?.scans || []
  const order = journey?.order
  const product = journey?.product || order?.product
  const hasAnomalies = (qr?.anomalyCount ?? 0) > 0
  const viewBanner = VIEW_BANNERS[viewType]
  const isMinimal = viewType === "minimal"
  const isLogistics = viewType === "logistics"

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white print:bg-white print:text-black">
      {/* Print-only styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:text-black { color: black !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D1A2D] to-[#111827] border-b border-[#1F2D40] px-4 py-5 print:bg-white print:border-gray-300">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-emerald-400 print:text-emerald-600" />
            <h1 className="text-lg font-bold print:text-black">Pramanik — Living QR Journey</h1>
          </div>
          {product && (
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Package className="w-4 h-4" />
              <span>{product.title}</span>
              {product.supplier && <span className="text-[#2775CA]">by {product.supplier.name}</span>}
            </div>
          )}
          {qr?.shortCode && (
            <div className="mt-2 text-xs font-mono text-[#6B7280]">
              QR: <span className="text-white print:text-black font-semibold">{qr.shortCode}</span>
              {qr.gs1DigitalLink && (
                <span className="ml-3 text-emerald-500">GS1 ✓</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* View Banner */}
        {viewBanner && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${viewBanner.color} print:hidden`}>
            {viewBanner.text}
          </div>
        )}

        {/* Anomaly Warning */}
        {hasAnomalies && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 flex gap-3 print:hidden">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Suspicious Activity Detected</p>
              <p className="text-xs text-zinc-400 mt-1">
                {qr.anomalyCount} anomalous scan{qr.anomalyCount > 1 ? "s" : ""} detected
                on this QR code. Verify product authenticity independently if in doubt.
              </p>
            </div>
          </div>
        )}

        {/* Scan Count Banner */}
        {!loading && qr && (
          <ScanCountBanner totalScans={qr.totalScans} status={order?.status} />
        )}

        {/* Journey Stats — hidden in minimal view */}
        {!isMinimal && (
          loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-[#111827] border border-[#1F2D40] rounded-xl p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Scans" value={qr?.totalScans ?? "—"} icon="📡" />
              <StatCard label="Unique Devices" value={qr?.uniqueDevices ?? "—"} icon="📱" />
              <StatCard
                label="Countries"
                value={qr?.countriesReached?.map((c: string) => countryToFlag(c)).join(" ") || "—"}
              />
              <StatCard label="Anchors" value={qr?.totalAnchors ?? "—"} icon="⛓️" />
            </div>
          )
        )}

        {/* Scan Result Banner */}
        {scanResult && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-[#111827] border border-emerald-800/40 rounded-xl p-4 print:hidden">
            <div className="flex items-center gap-2 text-sm">
              {navigator.onLine ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="text-emerald-400 font-medium">
                Scan #{scanResult.scanNumber} recorded
              </span>
              {scanResult.resolvedLocation && (
                <span className="text-[#6B7280]">
                  <MapPin className="w-3 h-3 inline" /> {scanResult.resolvedLocation}
                </span>
              )}
            </div>
            {scanResult.anchorPending && (
              <div className="text-xs text-amber-400 mt-1">⛓️ Stellar anchor queued</div>
            )}
          </div>
        )}

        {/* Genesis Anchor — shown in logistics and default */}
        {!isMinimal && qr?.genesisAnchorTx && (
          <div className="bg-[#111827] border border-[#1F2D40] rounded-xl p-4 print:border-gray-300 print:bg-white">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-2">
              Genesis Anchor
            </div>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${qr.genesisAnchorTx}`}
              target="_blank" rel="noreferrer"
              className="text-xs font-mono text-[#2775CA] hover:underline break-all flex items-center gap-1"
            >
              {qr.genesisAnchorTx}
              <ExternalLink className="w-3 h-3 shrink-0 print:hidden" />
            </a>
          </div>
        )}

        {/* Origin View — show supplier details and product proof */}
        {viewType === "origin" && product?.supplier && (
          <div className="bg-[#111827] border border-blue-800/40 rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-3">
              Origin Details
            </h2>
            <div className="space-y-2 text-sm">
              <div><span className="text-[#6B7280]">Supplier:</span> <span className="text-white font-medium">{product.supplier.name}</span></div>
              {product.supplier.location && <div><span className="text-[#6B7280]">Location:</span> <span className="text-white">{product.supplier.location}</span></div>}
              {product.supplier.trustScore !== undefined && <div><span className="text-[#6B7280]">Trust Score:</span> <span className="text-white">{product.supplier.trustScore}</span></div>}
            </div>
          </div>
        )}

        {/* Minimal View — only show product + status + last checkpoint */}
        {isMinimal && product && (
          <div className="bg-[#111827] border border-[#1F2D40] rounded-xl p-5">
            <div className="text-sm space-y-2">
              <div className="font-medium text-white">{product.title}</div>
              {order?.status && <div className="text-[#6B7280]">Status: <span className="text-white">{order.status}</span></div>}
              {scans[scans.length - 1] && (
                <div className="text-[#6B7280]">Last checkpoint: <span className="text-white">{scans[scans.length - 1].resolvedLocation}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Journey Timeline — hidden in minimal view */}
        {!isMinimal && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#6B7280] mb-4">
              Journey Timeline
            </h2>
            {scans.length === 0 && !loading && (
              <div className="text-[#6B7280] text-sm py-8 text-center">
                No scans recorded yet.
              </div>
            )}
            <div className="space-y-0">
              {scans.map((scan: any, i: number) => {
                const isLast = i === scans.length - 1
                return (
                  <div key={scan.scanNumber} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${scan.scanSource === "MACHINE" ? "bg-amber-500 text-black" :
                          scan.anchoredOnChain ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-300"}
                        print:border print:border-gray-400 print:bg-white print:text-black`}>
                        {scan.scanNumber}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-zinc-800 mt-1 min-h-[24px] print:bg-gray-300" />}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white print:text-black">
                          {scan.resolvedLocation || "Unknown location"}
                        </span>
                        {scan.ipCountry && <span>{countryToFlag(scan.ipCountry)}</span>}
                        {scan.anchoredOnChain && (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${scan.anchorTxId}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full hover:bg-emerald-900/70 transition print:bg-white print:text-emerald-700 print:border-emerald-600"
                          >
                            ⛓️ Stellar Verified
                          </a>
                        )}
                        {scan.scanSource === "MACHINE" && (
                          <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full print:text-amber-700 print:border-amber-600">
                            🏭 {scan.machineModel || "Machine Scanner"}
                          </span>
                        )}
                        {scan.ipIsProxy && (
                          <span className="text-xs bg-red-900/40 text-red-400 border border-red-800 px-2 py-0.5 rounded-full print:hidden">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />Proxy/VPN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-3 print:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(scan.serverTimestamp).toLocaleString()}
                        </span>
                        {!isLogistics && scan.deviceType && <span className="capitalize">{scan.deviceType}</span>}
                        {!isLogistics && scan.os && <span>{scan.os}</span>}
                        {!isLogistics && scan.browser && <span>{scan.browser}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Delivery Certificate */}
        {order?.status === "COMPLETED" && order?.deliveryCertCid && (
          <div className="bg-gradient-to-br from-emerald-900/20 to-[#111827] border border-emerald-500/20 rounded-xl p-5 print:border-emerald-600 print:bg-white">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-500/70 mb-3">
              ✅ Delivery Certificate
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[#6B7280] mb-1">IPFS CID</div>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${order.deliveryCertCid}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs font-mono text-[#2775CA] hover:underline break-all flex items-center gap-1"
                >
                  {order.deliveryCertCid}
                  <ExternalLink className="w-3 h-3 shrink-0 print:hidden" />
                </a>
              </div>
              {order.deliveryCertTxId && (
                <div>
                  <div className="text-xs text-[#6B7280] mb-1">Stellar Tx</div>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${order.deliveryCertTxId}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs font-mono text-[#2775CA] hover:underline break-all flex items-center gap-1"
                  >
                    {order.deliveryCertTxId}
                    <ExternalLink className="w-3 h-3 shrink-0 print:hidden" />
                  </a>
                </div>
              )}
              {order.deliveredAt && (
                <div className="text-xs text-emerald-400 print:text-emerald-700">
                  Delivered: {new Date(order.deliveredAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 border-t border-[#1F2D40] print:border-gray-300">
          <p className="text-xs text-[#6B7280] print:text-gray-500">
            Verified by <span className="text-white print:text-black font-semibold">Pramanik</span> on Stellar Blockchain
          </p>
        </div>
      </div>
    </div>
  )
}
