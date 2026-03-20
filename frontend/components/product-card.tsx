import React, { ReactNode } from "react"
import Link from "next/link"
import { CheckCircle2, ShieldAlert, Clock, ArrowRight, Award, Package, XCircle } from "lucide-react"
import { convertInrToUsdc } from "@/lib/exchange-rates"
import { Button } from "@/components/ui/button"

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
  // Gracefully handle legacy task/mission renaming maps if any leftover properties exist
  const id = task.id || task._id
  const title = task.title || task.name
  const description = task.description
  const status = task.status || task.missionStatus || "PENDING_VERIFICATION"
  const mediaUrls = task.proofMediaUrls || task.mediaUrls || []
  const image = mediaUrls[0] || null
  
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
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-5xl relative group overflow-hidden">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Package className="w-16 h-16 text-slate-600 opacity-60 group-hover:scale-110 transition-transform duration-500" />
        )}
        <span className={`absolute top-4 right-4 flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-semibold ${badge.class} backdrop-blur-sm`}>
          {badge.icon} {badge.label}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-foreground text-lg truncate">{title}</h3>
        
        {task.supplier && (
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
            <Award className="w-3 h-3 text-blue-400" />
            {task.supplier.name} {task.supplier.location ? `· ${task.supplier.location}` : ""}
          </p>
        )}

        {/* Trust Score */}
        {task.supplier?.isVerified && (
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold w-fit">
            <CheckCircle2 className="w-3 h-3" /> Verified Supplier · {task.supplier.trustScore}% Trust
          </span>
        )}

        {/* If no supplier info provided (fallback for old usage), show description */}
        {!task.supplier && description && (
          <p className="text-[#9CA3AF] text-sm line-clamp-2 mt-1 min-h-[40px] leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl font-bold text-foreground">₹{Number(priceInr).toLocaleString()}</span>
          <span className="text-sm text-blue-400 font-mono font-medium">≈ {Number(usdcPrice).toFixed(2)} USDC</span>
        </div>

        {/* Vote bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{voteReal} real</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" />{voteFake} fake</span>
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
    </div>
  )
}
