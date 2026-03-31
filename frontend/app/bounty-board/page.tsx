"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Briefcase, Search, ArrowRight, ShieldCheck, Sparkles, Coins, Clock, Package } from "lucide-react"
import { getAllBounties } from "@/lib/api-service"
import { useEffect } from "react"

type Bounty = {
  id: string
  title: string
  reward: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: "Verification" | "Growth" | "Ops" | "Engineering"
  description: string
}

const BOUNTIES: Bounty[] = [
  {
    id: "verify-queue-ux",
    title: "Improve verification queue UX",
    reward: "50 points",
    difficulty: "Easy",
    category: "Verification",
    description: "Refine the verify flow to reduce misclicks and improve decision clarity.",
  },
  {
    id: "seller-dashboard-kpis",
    title: "Add seller KPI widgets",
    reward: "100 points",
    difficulty: "Medium",
    category: "Growth",
    description: "Add conversion-focused KPI widgets for sellers (views → orders → completion).",
  },
  {
    id: "onchain-proof-viewer",
    title: "On-chain proof viewer",
    reward: "250 points",
    difficulty: "Hard",
    category: "Engineering",
    description: "Build a lightweight explorer panel for proofs/tx links with clear verification status.",
  },
]

export default function BountyBoardPage() {
  const [q, setQ] = useState("")
  const [realBounties, setRealBounties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllBounties().then(res => {
      if (res.success) setRealBounties(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredBounties = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return realBounties
    return realBounties.filter(b => 
      `${b.product?.title} ${b.description} ${b.product?.category}`.toLowerCase().includes(needle)
    )
  }, [q, realBounties])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm">Community marketplace</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">Bounty Board</h1>
            <p className="text-muted-foreground mt-2">Earn rewards by verifying product origins and providing proof.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/marketplace">
                <Package className="w-4 h-4 mr-2" />
                Browse Products
              </Link>
            </Button>
            <Button asChild>
              <Link href="/verify">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify products
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bounties by product or description..." className="pl-9" />
          </div>
          <Badge variant="secondary" className="whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> {filteredBounties.length} open
          </Badge>
        </div>

        <div className="grid gap-4 mt-8">
          {loading ? (
             <div className="space-y-4 animate-pulse">
               {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
             </div>
          ) : filteredBounties.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4" /> Available Bounties
              </h3>
              {filteredBounties.map((b) => (
                <Card key={b.id} className="p-6 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors" />
                  
                  <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <span className="font-bold text-xl group-hover:text-amber-500 transition-colors">{String(b.product?.title || "Product Proof")}</span>
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">Verification</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl italic">"{String(b.description || "")}"</p>
                      
                      <div className="flex items-center gap-4 mt-5 text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                          <Package className="w-3 h-3 text-amber-500/70" /> {String(b.product?.category || "General")}
                        </span>
                        <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                          <Clock className="w-3 h-3 text-amber-500/70" /> {new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {b.issuer?.email && (
                          <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                            By {b.issuer.email.split('@')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-amber-500/10 pt-4 md:pt-0 md:pl-8 min-w-[140px]">
                      <div className="text-center md:text-right">
                        <div className="text-2xl font-black text-amber-500 font-mono tracking-tighter">₹{Number(b.amount || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Reward Pool</div>
                      </div>
                      <Link href={`/product/${b.productId}`}>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-11 rounded-xl px-8 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform">
                          Fulfill <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No bounties found</h3>
              <p className="text-muted-foreground mb-6">Try searching for something else or create a new bounty.</p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/marketplace">Create Bounty from Marketplace</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
