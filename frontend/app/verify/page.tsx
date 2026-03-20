"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, HelpCircle, Trophy, Clock, ShieldCheck, Package } from "lucide-react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/tokens/${user.id}`);
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Verify Products</h1>
            <p className="text-muted-foreground mt-1">Review proof and vote to keep the marketplace clean.</p>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-2">
               You have {tokenBalance} tokens. Higher value products require staked tokens. You earn bonus tokens if your consensus is accurate!
            </p>
          </div>
          {tokensEarned > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-3 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">+{tokensEarned}</div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Community</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted border border-border rounded-xl p-1 w-fit mb-6">
          {(["queue", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "queue" ? `Pending (${remaining.length})` : "My Votes"}
            </button>
          ))}
        </div>

        {tab === "queue" && (
          <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-48" />
              ))
            ) : remaining.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium text-foreground">All caught up!</p>
                <p>No products pending verification right now.</p>
              </div>
            ) : (
              remaining.map((p) => {
                const total = p.voteReal + p.voteFake + p.voteNeedsProof
                const realPct = total > 0 ? Math.round((p.voteReal / total) * 100) : 0

                return (
                  <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:bg-accent transition-colors">
                    <div className="flex gap-5 p-5">
                      {/* Image */}
                      <div className="w-28 h-28 bg-muted rounded-xl flex items-center justify-center text-4xl shrink-0">
                        {p.proofMediaUrls?.[0] ? (
                          <img src={p.proofMediaUrls[0]} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : <Package className="w-12 h-12 text-muted-foreground opacity-60" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{p.title}</h3>
                            <p className="text-muted-foreground text-sm">{p.supplier.name} · {p.supplier.location}</p>
                          </div>
                          <span className="text-blue-400 font-bold font-mono shrink-0">₹{p.priceInr}</span>
                        </div>

                        {p.description && (
                          <p className="text-muted-foreground text-sm mt-2 line-clamp-2">{p.description}</p>
                        )}

                        {/* Current vote status */}
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {p._count.votes} votes so far
                          </span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${realPct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{realPct}% real</span>
                        </div>
                      </div>
                    </div>

                    {/* Vote buttons */}
                    <div className="border-t border-border px-5 py-3 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground mr-auto">Vote on this product:</span>
                      
                      {(() => {
                        const required = p.priceInr >= 20000 ? 50 : p.priceInr >= 5000 ? 10 : 0;
                        const disabled = tokenBalance < required;
                        return (
                          <>
                            {required > 0 && (
                               <span className="text-xs font-semibold mr-2 text-amber-500">
                                 Requires {required} Trust Tokens
                               </span>
                            )}
                            <button
                              disabled={disabled}
                              onClick={() => castVote(p.id, "REAL")}
                              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> Real
                            </button>
                            <button
                              disabled={disabled}
                              onClick={() => castVote(p.id, "FAKE")}
                              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'}`}
                            >
                              <XCircle className="w-4 h-4" /> Fake
                            </button>
                            <button
                              disabled={disabled}
                              onClick={() => castVote(p.id, "NEEDS_MORE_PROOF")}
                              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}
                            >
                              <HelpCircle className="w-4 h-4" /> Need More Proof
                            </button>
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
              <div className="mt-6">
                <h3 className="text-muted-foreground text-sm font-medium mb-3">Your votes this session:</h3>
                <div className="space-y-2">
                  {Object.entries(votes).map(([id, vote]) => {
                    const product = queue.find(p => p.id === id)
                    if (!product) return null
                    return (
                      <div key={id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                        <span className="text-sm">{product.title}</span>
                        <div className="flex items-center gap-2">
                          {vote === "REAL" && <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voted Real</span>}
                          {vote === "FAKE" && <span className="text-red-400 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Voted Fake</span>}
                          {vote === "NEEDS_MORE_PROOF" && <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Needs Proof</span>}
                          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Vote recorded</span>
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
          <div className="text-center py-20 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Connect your wallet to see your voting history.</p>
            <Button className="mt-4 rounded-xl">Connect Wallet</Button>
          </div>
        )}
      </div>
    </div>
  )
}
