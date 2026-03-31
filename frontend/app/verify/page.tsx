"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, HelpCircle, Trophy, Clock, ShieldCheck, Package, ExternalLink, Activity } from "lucide-react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import Image from "next/image"

interface PendingProduct {
  id: string
  title: string
  description?: string
  category: string
  priceInr: number
  proofMediaUrls: string[]
  voteReal: number
  voteFake: number
  voteNeedsProof: number
  createdAt: string
  supplier: { name: string; location: string; trustScore: number }
  _count: { votes: number }
}

export default function VerifyPage() {
  const [queue, setQueue] = useState<PendingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [tokensEarned, setTokensEarned] = useState(0)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [tab, setTab] = useState<"queue" | "history">("queue")
  const { user } = useSelector((s: RootState) => s.userAuth)

  useEffect(() => { 
    loadQueue();
    if (user?.id) loadTokens();
  }, [user?.id])

  const loadTokens = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/tokens/${user.id}`, { credentials: "include" });
      const data = await res.json();
      if (data.data?.balance !== undefined) setTokenBalance(data.data.balance);
    } catch {}
  }

  const loadQueue = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/community/queue`)
      const data = await res.json()
      setQueue(data.data || [])
    } catch {
      setQueue([])
    } finally {
      setLoading(false)
    }
  }

  const castVote = async (productId: string, voteType: "REAL" | "FAKE" | "NEEDS_MORE_PROOF") => {
    try {
      if (!user?.id) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${productId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, voteType, reason: "" }),
        credentials: "include"
      })
      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "Failed to vote due to insufficient stakes.");
        return;
      }
      
      const required = queue.find(p => p.id === productId)?.priceInr || 0;
      const deduction = required >= 20000 ? 50 : required >= 5000 ? 10 : 0;
      setTokenBalance(b => b - deduction);
    } catch {}
    setVotes(prev => ({ ...prev, [productId]: voteType }))
    setTokensEarned(t => t + 1)
  }

  const remaining = queue.filter(p => !votes[p.id])

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header />
      
      {/* ── Page Header ── */}
      <div className="relative border-b border-white/[0.04] bg-[#0A0D14] overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
                <ShieldCheck className="w-4 h-4" /> Consensus Protocol
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Verify Products
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                Review proof, vote on authenticity, and secure the marketplace. Earn Trust Tokens for accurate consensus.
              </p>
              <div className="inline-flex items-center gap-4 bg-[#0C0F17] border border-white/[0.06] rounded-2xl p-4 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Activity className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Available Stakes</div>
                  <div className="text-2xl font-bold font-mono text-white">{tokenBalance.toLocaleString()} <span className="text-sm font-sans text-orange-400">Tokens</span></div>
                </div>
              </div>
            </div>

            {tokensEarned > 0 && (
              <div className="premium-card rounded-3xl p-6 text-center shadow-emerald-500/10 shadow-2xl shrink-0 min-w-[200px] border-emerald-500/30">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Session Bonus</div>
                <div className="text-5xl font-bold font-mono text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">+{tokensEarned}</div>
                <div className="text-xs text-emerald-400/80 mt-2 font-medium">Stellar Tokens Mined</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-[#0A0D14] border border-white/[0.06] rounded-2xl w-fit mb-10 shadow-inner">
          {(["queue", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all capitalize ${
                tab === t ? "bg-[#1F2D40] text-white shadow-lg shadow-black/50 border border-white/10" : "text-slate-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {t === "queue" ? `Pending Review (${remaining.length})` : "My Voting History"}
            </button>
          ))}
        </div>

        {tab === "queue" && (
          <div className="space-y-6">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="premium-card rounded-[2rem] p-6 animate-pulse h-64" />
              ))
            ) : remaining.length === 0 ? (
              <div className="text-center py-32 premium-card rounded-[3rem]">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                  <ShieldCheck className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">All caught up!</h3>
                <p className="text-lg text-slate-400">No products are pending verification right now. Check back later.</p>
              </div>
            ) : (
              remaining.map((p) => {
                const total = p.voteReal + p.voteFake + p.voteNeedsProof
                const realPct = total > 0 ? Math.round((p.voteReal / total) * 100) : 0

                return (
                  <div key={p.id} className="premium-card rounded-[2rem] overflow-hidden group">
                    <div className="flex flex-col md:flex-row gap-8 p-8">
                      {/* Image */}
                      <div className="w-full md:w-48 h-48 bg-[#0C0F17] rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden relative border border-white/[0.04]">
                        {p.proofMediaUrls?.[0] ? (
                          <Image src={p.proofMediaUrls[0]} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : <Package className="w-16 h-16 text-slate-700" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{p.title}</h3>
                            <p className="text-slate-400 text-sm font-medium">{p.supplier.name} <span className="text-slate-600 mx-2">•</span> {p.supplier.location}</p>
                          </div>
                          <span className="text-blue-400 font-bold font-mono text-xl shrink-0 bg-blue-500/10 px-4 py-1.5 rounded-xl border border-blue-500/20">₹{p.priceInr.toLocaleString()}</span>
                        </div>

                        {p.description && (
                          <p className="text-slate-400 text-base leading-relaxed mt-4 line-clamp-2">{p.description}</p>
                        )}

                        {/* Current vote status */}
                        <div className="mt-6 bg-[#0C0F17] border border-white/[0.04] p-4 rounded-xl flex items-center gap-6">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {p._count.votes} Votes Total
                          </span>
                          <div className="flex-1 h-2 bg-[#1A2235] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${realPct}%` }} />
                          </div>
                          <span className="text-sm font-bold text-emerald-400">{realPct}% Authentic</span>
                        </div>
                      </div>
                    </div>

                    {/* Vote buttons */}
                    <div className="bg-[#0A0D14] border-t border-white/[0.06] px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {(() => {
                        const required = p.priceInr >= 20000 ? 50 : p.priceInr >= 5000 ? 10 : 0;
                        const disabled = tokenBalance < required;
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your Consensus:</span>
                              {required > 0 && (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  Requires {required} Stakes
                                </span>
                              )}
                            </div>
                            
                            <div className="flex gap-3">
                              <button
                                disabled={disabled}
                                onClick={() => castVote(p.id, "REAL")}
                                className={`flex items-center justify-center gap-2 border-2 rounded-xl px-6 py-3 text-sm font-bold transition-all h-12 ${disabled ? 'opacity-40 cursor-not-allowed bg-[#0C0F17] border-white/5 text-slate-500' : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
                              >
                                <CheckCircle2 className="w-5 h-5" /> Authentic
                              </button>
                              <button
                                disabled={disabled}
                                onClick={() => castVote(p.id, "FAKE")}
                                className={`flex items-center justify-center gap-2 border-2 rounded-xl px-6 py-3 text-sm font-bold transition-all h-12 ${disabled ? 'opacity-40 cursor-not-allowed bg-[#0C0F17] border-white/5 text-slate-500' : 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}
                              >
                                <XCircle className="w-5 h-5" /> Fake
                              </button>
                              <button
                                disabled={disabled}
                                onClick={() => castVote(p.id, "NEEDS_MORE_PROOF")}
                                className={`flex items-center justify-center gap-2 border-2 rounded-xl px-6 py-3 text-sm font-bold transition-all h-12 ${disabled ? 'opacity-40 cursor-not-allowed bg-[#0C0F17] border-white/5 text-slate-500' : 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'}`}
                              >
                                <HelpCircle className="w-5 h-5" /> Need Proof
                              </button>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )
              })
            )}

            {/* Voted items */}
            {Object.keys(votes).length > 0 && (
              <div className="mt-12">
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Session Activity Log
                </h3>
                <div className="space-y-3">
                  {Object.entries(votes).map(([id, vote]) => {
                    const product = queue.find(p => p.id === id)
                    if (!product) return null
                    return (
                      <div key={id} className="flex items-center justify-between premium-card rounded-2xl px-6 py-4 border-l-4 border-l-emerald-500">
                        <span className="text-base font-bold text-white">{product.title}</span>
                        <div className="flex items-center gap-4">
                          {vote === "REAL" && <span className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Voted Authentic</span>}
                          {vote === "FAKE" && <span className="text-red-400 text-sm font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 flex items-center gap-2"><XCircle className="w-4 h-4" /> Voted Fake</span>}
                          {vote === "NEEDS_MORE_PROOF" && <span className="text-amber-400 text-sm font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Requested Proof</span>}
                          <span className="text-slate-500 text-xs font-mono uppercase">Tx Recorded</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="text-center py-32 premium-card rounded-[3rem]">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#0C0F17] flex items-center justify-center border border-white/[0.06] shadow-inner">
              <Trophy className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Connect your wallet</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">Please securely connect your Stellar wallet to view your historical voting records and earned tokens.</p>
            <Button className="h-14 px-8 rounded-2xl text-lg font-bold bg-white text-black hover:bg-slate-200 transition-all shadow-lg hover:shadow-white/20">
              Connect Stellar Wallet
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
