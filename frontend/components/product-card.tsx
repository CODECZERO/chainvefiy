import React, { useState, ReactNode } from "react"
import Link from "next/link"
import { CheckCircle2, ShieldAlert, Clock, ArrowRight, Award, Package, XCircle, Maximize2, QrCode } from "lucide-react"
import { convertInrToUsdc } from "@/lib/exchange-rates"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { getIPFSUrl } from "@/lib/image-utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const STATUS_BADGE: Record<string, { label: string; class: string; icon: ReactNode }> = {
  VERIFIED: {
    label: "Verified",
    class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    class: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <Clock className="w-3 h-3" />,
  },
  FLAGGED: {
    label: "Flagged",
    class: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
}

export function ProductCard({ task, index = 0, usdcInr = 83.33 }: { task: any; index?: number; usdcInr?: number; key?: React.Key }) {
  const [imgError, setImgError] = useState(false)
  const [showFullImg, setShowFullImg] = useState(false)
  const [showQR, setShowQR] = useState(false)
  
  // Gracefully handle legacy task/mission renaming maps if any leftover properties exist
  const id = task.id || task._id
  const title = task.title || task.name
  const description = task.description
  const status = task.status || task.missionStatus || "PENDING_VERIFICATION"
  const mediaUrls = task.proofMediaUrls || task.mediaUrls || []
  const image = mediaUrls[0] || null
  const qrCodeUrl = task.qrCodeUrl
  
  const voteReal = task.voteReal || 0
  const voteFake = task.voteFake || 0
  const totalVotes = voteReal + voteFake
  const realPct = totalVotes > 0 ? (voteReal / totalVotes) * 100 : 0
  
  const priceInr = task.priceInr || 0
  const usdcPrice = typeof task.priceUsdc === "number" && task.priceUsdc > 0 ? task.priceUsdc : convertInrToUsdc(priceInr, usdcInr)

  const badge = STATUS_BADGE[status] || STATUS_BADGE.PENDING_VERIFICATION

  return (
    <div
      className="glass-card rounded-3xl overflow-hidden flex flex-col animate-fade-in-up hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(232,119,46,0.1)] transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Image Container */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-5xl relative group overflow-hidden">
        {image && !imgError ? (
          <>
            <Image 
              src={getIPFSUrl(image)} 
              alt={title} 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
            {/* Full View Button */}
            <button 
              onClick={(e) => { e.preventDefault(); setShowFullImg(true); }}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
            >
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </button>
          </>
        ) : (
          <Package className="w-16 h-16 text-slate-600 opacity-60 group-hover:scale-110 transition-transform duration-500" />
        )}
        
        {/* Status Badge */}
        <span className={`absolute top-4 right-4 flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-semibold ${badge.class} backdrop-blur-sm z-20`}>
          {badge.icon} {badge.label}
        </span>

        {/* QR Code Shortcut */}
        {qrCodeUrl && (
          <button 
            onClick={(e) => { e.preventDefault(); setShowQR(true); }}
            className="absolute bottom-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all z-20"
            title="View QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-foreground text-lg truncate">{String(title || "")}</h3>
        
        {task.supplier && (
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
            <Award className="w-3 h-3 text-blue-400" />
            {String(task.supplier.name || "Supplier")} {task.supplier.location ? `· ${String(task.supplier.location)}` : ""}
          </p>
        )}

        {/* Trust Score */}
        {task.supplier?.isVerified && (
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold w-fit">
            <CheckCircle2 className="w-3 h-3" /> Verified Supplier · {String(task.supplier.trustScore || 0)}% Trust
          </span>
        )}

        {/* If no supplier info provided (fallback for old usage), show description */}
        {!task.supplier && description && (
          <p className="text-[#9CA3AF] text-sm line-clamp-2 mt-1 min-h-[40px] leading-relaxed">
            {String(description || "")}
          </p>
        )}

        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl font-bold text-foreground">₹{Number(priceInr).toLocaleString()}</span>
          <span className="text-sm text-blue-400 font-mono font-medium">≈ {Number(usdcPrice).toFixed(2)} USDC</span>
        </div>

        {/* Vote bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{String(voteReal || 0)} real</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" />{String(voteFake || 0)} fake</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${realPct}%` }} />
          </div>
        </div>

        <Link href={`/product/${id}`} className="mt-5 block">
          <Button variant="secondary" className="w-full rounded-2xl h-11 text-sm font-semibold transition-all">
            View Product
          </Button>
        </Link>
      </div>

      {/* Full Image Modal */}
      <Dialog open={showFullImg} onOpenChange={setShowFullImg}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-white/10">
          <div className="relative aspect-video w-full h-[80vh]">
            <Image 
              src={getIPFSUrl(image)} 
              alt={title} 
              fill 
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-md bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-center">Product QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="bg-white p-4 rounded-3xl">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-sm text-zinc-400 text-center">Scan this code to view the product and verify its authenticity on the blockchain.</p>
            <Button 
               variant="outline" 
               className="w-full rounded-2xl"
               onClick={() => {
                 const link = document.createElement('a');
                 link.href = qrCodeUrl;
                 link.download = `qr-${id}.png`;
                 link.click();
               }}
            >
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
