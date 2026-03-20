"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Trophy, Star, ShieldCheck, TrendingUp, Medal } from "lucide-react"

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({ verifiers: "0", products: "0", tokens: "0" })

  useEffect(() => {
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/community/leaderboard`)
      .then(r => r.json())
      .then(res => {
        if (res.data?.length) {
          const mapped = res.data.map((l: any, i: number) => ({
            rank: i + 1,
            name: l.user?.name || `Verifier ${i+1}`,
            tokens: l.tokens,
            votes: l.votes,
            accuracy: l.accuracy,
            badge: l.tokens > 200 ? "Elite Verifier" : l.tokens > 100 ? "Top Verifier" : "Verifier"
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
      .then(r => r.json())
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold">Top Verifiers</h1>
          <p className="text-muted-foreground mt-2">Community members who verify products accurately rise on the leaderboard</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Verifiers", value: stats.verifiers, icon: <ShieldCheck className="w-4 h-4 text-orange-400" /> },
            { label: "Products Verified", value: stats.products, icon: <Star className="w-4 h-4 text-amber-400" /> },
            { label: "Total votes", value: stats.tokens, icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-muted-foreground text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl px-5 py-4 animate-pulse h-20" />
            ))
          ) : leaders.map((l, i) => {
            const rank = l.rank || i + 1
            const rowStyle = RANK_STYLES[rank] || "bg-slate-800 border-slate-700"
            return (
              <div key={rank} className={`flex items-center gap-4 border rounded-2xl px-5 py-4 transition-colors hover:bg-accent ${rowStyle}`}>
                <div className="w-10 text-center shrink-0">
                  {RANK_ICON[rank] ? (
                    <div className="flex justify-center">{RANK_ICON[rank]}</div>
                  ) : (
                    <span className="text-muted-foreground font-bold text-lg">#{rank}</span>
                  )}
                </div>

                <div className="w-10 h-10 rounded-full bg-primary/60 flex items-center justify-center font-bold shrink-0 text-primary-foreground">
                  {(l.name || "U")[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{l.name || `User ${rank}`}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{l.badge || "Verifier"}</div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-amber-400">{l.tokens} <span className="text-xs font-normal text-amber-400/70">tokens</span></div>
                  <div className="text-muted-foreground text-xs">{l.votes} votes · {l.accuracy} acc.</div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8">
          Start verifying products to climb the leaderboard
        </p>
      </div>
    </div>
  )
}
