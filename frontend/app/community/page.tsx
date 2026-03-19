"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Search, ShieldCheck, Lock } from "lucide-react"

type Post = {
  id: string
  title: string
  body: string
  tag: "Announcements" | "Support" | "Verification"
}

const POSTS: Post[] = [
  {
    id: "welcome",
    title: "Welcome to Pramanik community",
    body: "Share feedback, verification suggestions, and supplier/buyer tips.",
    tag: "Announcements",
  },
  {
    id: "how-to-verify",
    title: "How to vote accurately",
    body: "Look for original proof, consistent packaging, and stage updates with location signals.",
    tag: "Verification",
  },
  {
    id: "support-whatsapp",
    title: "WhatsApp listing help",
    body: "If your messages aren’t being recognized, share the exact text you sent and your country code.",
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Community</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">Community discussions</h1>
            <p className="text-muted-foreground mt-2">Read updates and best practices. Posting and commenting require login.</p>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button disabled>Create post (next)</Button>
            ) : (
              <Badge variant="secondary" className="whitespace-nowrap">
                <Lock className="w-3.5 h-3.5 mr-1" /> Login required to post
              </Badge>
            )}
            <Button asChild variant="outline">
              <Link href="/verify">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search community posts..." className="pl-9" />
          </div>
        </div>

        <div className="grid gap-3 mt-6">
          {items.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <p className="text-muted-foreground text-sm mt-2">{p.body}</p>
                </div>
                <Badge variant="outline">{p.tag}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
