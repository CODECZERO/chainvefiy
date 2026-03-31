"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Search, ShieldCheck, Lock, Sparkles, MessageCircle } from "lucide-react"

type Post = {
  id: string
  title: string
  body: string
  tag: "Announcements" | "Support" | "Verification"
}

const POSTS: Post[] = [
  {
    id: "welcome",
    title: "Welcome to the Pramanik Network",
    body: "Share feedback, verification suggestions, and interact with top suppliers and buyers.",
    tag: "Announcements",
  },
  {
    id: "how-to-verify",
    title: "How to vote accurately on Proof",
    body: "Ensure you check the original proof, cross-reference GPS locations, and check Stellar immutable timestamps.",
    tag: "Verification",
  },
  {
    id: "support-whatsapp",
    title: "Onboarding via WhatsApp AI",
    body: "If our LLM isn't parsing your product correctly, ensure you include pricing formatting (e.g., 'Price: ₹500').",
    tag: "Support",
  },
]

export default function CommunityPage() {
  const { isAuthenticated } = useSelector((s: RootState) => s.userAuth)
  const [q, setQ] = useState("")

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return POSTS
    return POSTS.filter((p) => `${p.title} ${p.body} ${p.tag}`.toLowerCase().includes(needle))
  }, [q])

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header />
      
      {/* ── Page Header ── */}
      <div className="relative border-b border-white/[0.04] bg-[#0A0D14] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
                <MessageSquare className="w-4 h-4" /> Global Community
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Decentralized Discourse
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                Connect with verifiers, top suppliers, and active buyers in our verified ecosystem.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isAuthenticated ? (
                <Button disabled className="h-12 px-6 rounded-xl font-bold bg-white/10 text-white border-white/20">
                  <MessageCircle className="w-4 h-4 mr-2" /> New Topic
                </Button>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-xl text-sm">
                  <Lock className="w-4 h-4" /> Sign In to Post
                </span>
              )}
              <Link href="/verify">
                <Button className="h-12 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Earn Tokens
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="premium-card rounded-3xl p-6 mb-10 shadow-xl">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search discussions, tags, or topics..." 
              className="pl-16 h-16 rounded-2xl text-base bg-[#0C0F17] border-white/[0.06] focus-visible:ring-blue-500 focus-visible:border-blue-500 shadow-inner text-white" 
            />
          </div>
        </div>

        <div className="grid gap-4">
          {items.map((p) => (
            <Link href={`/community/${p.id}`} key={p.id} className="premium-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-blue-500/30 group block">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{p.title}</h3>
                <p className="text-slate-400 text-base leading-relaxed">{p.body}</p>
              </div>
              <div className="shrink-0 flex items-center gap-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  p.tag === 'Announcements' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  p.tag === 'Verification' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {p.tag}
                </span>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm font-semibold">
                  <MessageCircle className="w-4 h-4" /> 0
                </div>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="text-center py-24 premium-card rounded-3xl">
              <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No discussions found</h3>
              <p className="text-slate-400">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
