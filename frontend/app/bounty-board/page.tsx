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

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const internal = needle 
      ? BOUNTIES.filter((b) => `${b.title} ${b.description} ${b.category}`.toLowerCase().includes(needle))
      : BOUNTIES
    
    const products = needle
      ? realBounties.filter(b => `${b.product?.title} ${b.description}`.toLowerCase().includes(needle))
      : realBounties

    return { internal, products }
  }, [q, realBounties])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span className="text-sm">Bounty board</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">Bounties</h1>
            <p className="text-muted-foreground mt-2">Pick a task, ship an improvement, and earn points.</p>
          </div>
          <Button asChild>
            <Link href="/verify">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify products
            </Link>
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bounties..." className="pl-9" />
          </div>
          <Badge variant="secondary" className="whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> {items.internal.length + items.products.length} open
          </Badge>
        </div>

        <div className="grid gap-4 mt-6">
          {items.products.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4" /> Product Verification Bounties
              </h3>
              {items.products.map((b) => (
                <Card key={b.id} className="p-5 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold text-lg group-hover:text-amber-500 transition-colors">{String(b.product?.title || "Product Proof")}</span>
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-bold text-[10px] uppercase tracking-wider">Verification</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm italic">"{String(b.description || "")}"</p>
                      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {String(b.product?.category || "General")}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {String(new Date(b.createdAt).toLocaleDateString())}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-full md:w-auto flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4">
                      <div>
                        <div className="text-2xl font-black text-amber-500 font-mono">₹{String(b.amount || 0)}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Reward Pool</div>
                      </div>
                      <Link href={`/product/${b.productId}`}>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-10 rounded-xl px-6">
                          Fulfill <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {items.internal.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Internal Tasks
              </h3>
              {items.internal.map((b) => (
                <Card key={b.id} className="p-5 border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="font-semibold text-white">{b.title}</div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{b.category}</Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider opacity-70">{b.difficulty}</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{b.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-white">{b.reward}</div>
                      <Button variant="ghost" className="mt-2 text-xs h-8 text-primary hover:text-primary hover:bg-primary/10">
                        View Details <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
