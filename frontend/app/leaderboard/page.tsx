"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Trophy, Star, ShieldCheck, TrendingUp, Medal, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-500/10 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  2: "bg-slate-300/10 border-slate-300/30 shadow-[0_0_30px_rgba(203,213,225,0.15)]",
  3: "bg-orange-600/10 border-orange-600/30 shadow-[0_0_30px_rgba(234,88,12,0.15)]",
}

const RANK_ICON: Record<number, React.ReactNode> = {
  1: <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />,
  2: <Medal className="w-8 h-8 text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]" />,
  3: <Medal className="w-8 h-8 text-orange-500 drop-shadow-[0_0_10px_rgba(234,88,12,0.5)]" />,
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({ verifiers: "0", products: "0", tokens: "0" })

  useEffect(() => {
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/community/leaderboard`)
      .then(r => {
        if (!r.ok || r.status === 204) return { data: [] }
        return r.json()
      })
      .then(res => {
        if (res.data?.length) {
          const mapped = res.data.map((l: any, i: number) => ({
            rank: i + 1,
            name: l.user?.name || `Verifier ${i+1}`,
            tokens: l.tokens,
            votes: l.votes,
            accuracy: l.accuracy,
            badge: l.tokens > 200 ? "Elite Vanguard" : l.tokens > 100 ? "Top Auditor" : "Verified Auditor"
          }))
          setLeaders(mapped)
        } else {
          setLeaders([])
        }
      })
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false))

    // Global Stats for the top cards
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats`)
      .then(r => {
        if (!r.ok || r.status === 204) return { data: null }
        return r.json()
      })
      .then(res => {
        if (res.data) {
          setStats({
            verifiers: res.data.totalSuppliers || 0,
            products: res.data.verifiedProducts || 0,
            tokens: `${res.data.totalTrustTokens || 0}`
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header />
      
      {/* ── Page Header ── */}
      <div className="relative border-b border-white/[0.04] bg-[#0A0D14] overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20 relative z-10 text-center">
          <span className="inline-flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
            <Trophy className="w-4 h-4" /> Global Rankings
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white drop-shadow-xl">
            Protocol Guardians
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Leading community members securing the network through accurate consensus voting.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ── Global Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { label: "Active Guardians", value: stats.verifiers, icon: <ShieldCheck className="w-6 h-6 text-orange-400" />, glow: "shadow-orange-500/10" },
            { label: "Assets Verified", value: stats.products, icon: <Star className="w-6 h-6 text-amber-400" />, glow: "shadow-amber-500/10" },
            { label: "Consensus Points", value: stats.tokens, icon: <TrendingUp className="w-6 h-6 text-emerald-400" />, glow: "shadow-emerald-500/10" },
          ].map((s, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              key={s.label} 
              className={`premium-card rounded-3xl p-8 text-center shadow-xl border-white/[0.06] ${s.glow}`}
            >
              <div className="w-14 h-14 bg-[#0C0F17] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/[0.04] shadow-inner">
                {s.icon}
              </div>
              <div className="text-4xl font-bold font-mono text-white tracking-tighter mb-2">{s.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Leaderboard Rankings ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-6 pb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-16 md:w-24 text-center">Rank</div>
            <div className="flex-1">Guardian Identity</div>
            <div className="text-right w-32 md:w-48">Consensus Weight</div>
          </div>

          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="premium-card rounded-2xl p-6 h-28 animate-pulse border-white/[0.04]" />
            ))
          ) : leaders.map((l, i) => {
            const rank = l.rank || i + 1
            const rowStyle = RANK_STYLES[rank] || "bg-[#0C0F17] border-white/[0.04] hover:bg-white/[0.02]"
            const isTop3 = rank <= 3

            return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                key={rank} 
                className={`flex items-center gap-4 md:gap-8 rounded-[2rem] px-6 py-5 md:py-6 transition-all group ${rowStyle}`}
              >
                {/* Rank Badge */}
                <div className="w-16 md:w-24 flex justify-center shrink-0">
                  {RANK_ICON[rank] ? (
                    <div>{RANK_ICON[rank]}</div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1F2D40] flex items-center justify-center font-bold text-slate-300 font-mono shadow-inner border border-white/5">
                      #{rank}
                    </div>
                  )}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0 flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shrink-0 ${
                    isTop3 ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-[#1F2D40] text-slate-300 border border-white/5'
                  }`}>
                    {(l.name || "U")[0]}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold truncate ${isTop3 ? 'text-white' : 'text-slate-200 group-hover:text-white transition-colors'}`}>
                      {l.name || `Guardian ${rank}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {isTop3 && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      <span className={`text-xs font-bold uppercase tracking-wider ${isTop3 ? 'text-amber-400/90' : 'text-slate-500'}`}>
                        {l.badge || "Verifier"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tokens & Stats */}
                <div className="text-right shrink-0 w-32 md:w-48">
                  <div className="text-2xl font-bold font-mono text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    {l.tokens.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
                    {l.votes} Votes
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="premium-card rounded-3xl p-8 mt-16 text-center shadow-2xl">
          <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Join the Vanguard</h3>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            Connect your stellar wallet and start auditing proof to secure the network and climb the global rankings.
          </p>
        </div>
      </div>
    </div>
  )
}
