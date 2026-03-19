import React from "react"
import Link from "next/link"
import { CheckCircle2, ShieldAlert, Clock, ArrowRight } from "lucide-react"
import { convertInrToUsdc } from "@/lib/exchange-rates"

export function ProductCard({ task }: { task: any }) {
  // Gracefully handle legacy task/mission renaming maps if any leftover properties exist
  const id = task.id || task._id
  const title = task.title || task.name
  const description = task.description
  const status = task.status || task.missionStatus
  const mediaUrls = task.proofMediaUrls || task.mediaUrls || []
  const image = mediaUrls[0] || "https://images.unsplash.com/photo-1510166089176-b57564a542b1?auto=format&fit=crop&q=80&w=400&h=300"
  
  const voteReal = task.voteReal || 0
  const voteFake = task.voteFake || 0
  const totalVotes = voteReal + voteFake
  const trustPct = totalVotes > 0 ? (voteReal / totalVotes) * 100 : 0
  
  const priceInr = task.priceInr || 0
  const priceUsdc = priceInr > 0 ? convertInrToUsdc(priceInr, 83.33).toFixed(4) : "0.0000"

  let badge = { cls: "bg-amber-500/90 text-white backdrop-blur", icon: Clock, text: "Pending" }
  if (status === "VERIFIED") badge = { cls: "bg-emerald-500/90 text-white backdrop-blur", icon: CheckCircle2, text: "Verified" }
  else if (status === "FLAGGED") badge = { cls: "bg-red-500/90 text-white backdrop-blur", icon: ShieldAlert, text: "Flagged" }

  return (
    <div className="group flex flex-col bg-[#111827] border border-[#1F2D40] rounded-2xl overflow-hidden hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(232,119,46,0.1)] transition-all duration-300">
      
      {/* ── IMAGE AREA ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0D1321]">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-80" />
        
        {/* Status Badge */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${badge.cls}`}>
          <badge.icon className="w-3.5 h-3.5" /> {badge.text}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex flex-col flex-1 p-5 pt-4">
        
        <div className="mb-3">
          <h3 className="font-bold text-lg text-[#F9FAFB] line-clamp-1 group-hover:text-orange-400 transition-colors">{title}</h3>
          <p className="text-[#9CA3AF] text-sm line-clamp-2 mt-1 min-h-[40px] leading-relaxed">
            {description}
          </p>
        </div>

        {/* ── VOTING BAR ── */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {voteReal} Real
            </span>
            <span className="text-red-400">{voteFake} Fake</span>
          </div>
          <div className="h-1.5 bg-[#1C2333] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full transition-all duration-1000"
              style={{ width: `${totalVotes > 0 ? trustPct : 100}%`, opacity: totalVotes > 0 ? 1 : 0.2 }} 
            />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[#1F2D40] flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tight">₹{priceInr}</span>
            </div>
            <div className="text-xs font-mono text-[#2775CA] font-medium mt-0.5 border border-[#2775CA]/20 bg-[#2775CA]/10 px-1.5 py-0.5 rounded inline-block">
              {priceUsdc} USDC
            </div>
          </div>
          
          <Link href={`/product/${id}`}>
            <button className="bg-[#E8772E] hover:bg-[#d96a24] text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:w-auto group-hover:px-4 active:scale-95 shadow-lg shadow-orange-500/20">
              <span className="hidden group-hover:inline text-sm font-semibold mr-1.5 overflow-hidden whitespace-nowrap">View</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

      </div>
    </div>
  )
}
