"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Briefcase, Search, ArrowRight, ShieldCheck, Sparkles } from "lucide-react"

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
    reward: "50 Trust Tokens",
    difficulty: "Easy",
    category: "Verification",
    description: "Refine the verify flow to reduce misclicks and improve decision clarity.",
  },
  {
    id: "seller-dashboard-kpis",
    title: "Add seller KPI widgets",
    reward: "100 Trust Tokens",
    difficulty: "Medium",
    category: "Growth",
    description: "Add conversion-focused KPI widgets for sellers (views → orders → completion).",
  },
  {
    id: "onchain-proof-viewer",
    title: "On-chain proof viewer",
    reward: "250 Trust Tokens",
    difficulty: "Hard",
    category: "Engineering",
    description: "Build a lightweight explorer panel for proofs/tx links with clear verification status.",
  },
]

export default function BountyBoardPage() {
  const [q, setQ] = useState("")
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return BOUNTIES
    return BOUNTIES.filter((b) => `${b.title} ${b.description} ${b.category}`.toLowerCase().includes(needle))
  }, [q])

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
            <p className="text-muted-foreground mt-2">Pick a task, ship an improvement, and earn Trust Tokens.</p>
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
            <Sparkles className="w-3.5 h-3.5 mr-1" /> {items.length} open
          </Badge>
        </div>

        <div className="grid gap-3 mt-6">
          {items.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium truncate">{b.title}</div>
                    <Badge variant="outline">{b.category}</Badge>
                    <Badge variant="secondary">{b.difficulty}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">{b.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">{b.reward}</div>
                  <Button variant="outline" className="mt-3">
                    View details <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
