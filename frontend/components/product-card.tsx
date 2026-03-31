"use client"

import React, { useState, ReactNode } from "react"
import Link from "next/link"
import { CheckCircle2, ShieldAlert, Clock, ArrowRight, Award, Package, XCircle, Maximize2, QrCode, ShoppingCart, Eye } from "lucide-react"
import { convertInrToUsdc } from "@/lib/exchange-rates"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { getIPFSUrl } from "@/lib/image-utils"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STATUS_BADGE: Record<string, { label: string; class: string; icon: ReactNode }> = {
  VERIFIED: {
    label: "Verified",
    class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    class: "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-500/10",
    icon: <Clock className="w-3 h-3" />,
  },
  FLAGGED: {
    label: "Flagged",
    class: "bg-red-500/15 text-red-400 border-red-500/30 shadow-red-500/10",
    icon: <XCircle className="w-3 h-3" />,
  },
}

export function ProductCard({ task, index = 0, usdcInr = 83.33 }: { task: any; index?: number; usdcInr?: number; key?: React.Key }) {
  const [imgError, setImgError] = useState(false)
  const [showFullImg, setShowFullImg] = useState(false)
  const [showQR, setShowQR] = useState(false)
  
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="rounded-3xl overflow-hidden flex flex-col bg-[#111827]/80 backdrop-blur-xl border border-white/[0.06] hover:border-orange-500/30 hover:shadow-[0_8px_32px_rgba(232,119,46,0.12)] transition-all duration-300 group"
    >
      {/* Image Container */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-800/60 to-slate-900/80 flex items-center justify-center text-5xl relative overflow-hidden">
        {image && !imgError ? (
          <>
            <Image 
              src={getIPFSUrl(image)} 
              alt={title} 
              fill 
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              onError={() => setImgError(true)}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Full View Button */}
            <button 
              onClick={(e) => { e.preventDefault(); setShowFullImg(true); }}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-10"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1 }}
                className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-xl"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </motion.div>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Package className="w-14 h-14 text-slate-600/40 group-hover:text-slate-500/60 transition-colors duration-500" />
            <span className="text-xs text-slate-600 font-medium">No image</span>
          </div>
        )}
        
        {/* Status Badge */}
        <span className={`absolute top-3.5 right-3.5 flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-[11px] font-semibold ${badge.class} backdrop-blur-md shadow-lg z-20`}>
          {badge.icon} {badge.label}
        </span>

        {/* Category pill */}
        {task.category && (
          <span className="absolute top-3.5 left-3.5 bg-black/40 backdrop-blur-md text-white/80 border border-white/10 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider z-20">
            {String(task.category)}
          </span>
        )}

        {/* QR Code Shortcut */}
        {qrCodeUrl && (
          <button 
            onClick={(e) => { e.preventDefault(); setShowQR(true); }}
            className="absolute bottom-3.5 right-3.5 p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all z-20 shadow-lg"
            title="View QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Title & Supplier */}
        <h3 className="font-bold text-foreground text-lg truncate group-hover:text-orange-300 transition-colors duration-300">
          {String(title || "")}
        </h3>
        
        {task.supplier && (
          <div className="flex items-center gap-2 mt-1.5">
            <Award className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-muted-foreground text-sm truncate">
              {String(task.supplier?.name || "Supplier")} {task.supplier?.location ? `· ${String(task.supplier.location)}` : ""}
            </span>
            {task.supplier?.isVerified && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>
        )}

        {!task.supplier && description && (
          <p className="text-[#9CA3AF] text-sm line-clamp-2 mt-1.5 min-h-[40px] leading-relaxed">
            {String(description || "")}
          </p>
        )}

        {/* Price Section */}
        <div className="flex items-end justify-between mt-4 pt-3 border-t border-white/[0.04]">
          <div>
            <span className="text-2xl font-bold text-foreground tracking-tight">₹{Number(priceInr).toLocaleString()}</span>
            <div className="text-xs text-[#2775CA] font-mono font-semibold mt-0.5">≈ {Number(usdcPrice).toFixed(2)} USDC</div>
          </div>
          {task.supplier?.trustScore > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Trust</div>
              <div className="text-sm font-bold text-emerald-400">{String(task.supplier?.trustScore || 0)}%</div>
            </div>
          )}
        </div>

        {/* Vote bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {String(voteReal)} real
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {String(voteFake)} fake
            </span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${realPct}%` }}
              transition={{ duration: 1, delay: 0.3 + index * 0.08, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-5 flex gap-2">
          <Link href={`/product/${id}`} className="flex-1">
            <Button className="w-full rounded-2xl h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all">
              <Eye className="w-4 h-4 mr-1.5" /> View Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Full Image Modal */}
      <Dialog open={showFullImg} onOpenChange={setShowFullImg}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-white/10 rounded-3xl">
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
        <DialogContent className="max-w-md bg-[#0F172A]/95 backdrop-blur-xl border-white/10 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Product QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-5">
            <div className="bg-white p-4 rounded-3xl shadow-2xl relative w-56 h-56">
              <Image src={qrCodeUrl} alt="QR Code" fill className="object-contain" />
            </div>
            <p className="text-sm text-zinc-400 text-center leading-relaxed">
              Scan this code to verify the product's authenticity on the Stellar blockchain.
            </p>
            <Button 
               variant="outline" 
               className="w-full rounded-2xl h-11"
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
    </motion.div>
  )
}
