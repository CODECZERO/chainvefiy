"use client"

import React, { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { ProductCard } from "@/components/product-card"
import { MessageCircle, CheckCircle2, MapPin, Calendar, Package, AlertTriangle, ShieldCheck } from "lucide-react"

export default function SupplierProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [flagging, setFlagging] = useState(false)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [profRes, prodRes] = await Promise.all([
          fetch(`${api}/suppliers/${params.id}`),
          fetch(`${api}/suppliers/${params.id}/products`)
        ])
        const prof = await profRes.json()
        const prods = (await prodRes.json()).data || []
        setProfile(prof.data || prof)
        setProducts(prods)
      } catch (e) {
        console.error("Failed to load supplier", e)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [params.id])

  const handleFlagSupplier = async () => {
    if (!profile || flagging) return;
    if (!confirm("Are you sure you want to flag this supplier?")) return;
    
    setFlagging(true);
    try {
      const res = await fetch(`${api}/v2/suppliers/${params.id}/flag`, {
        method: 'POST' // Make sure it hits the right versioned route, if they use v2 in the main index
      });
      // The current frontend uses ${api}/suppliers in fetchProfile.
      // Wait, let's look at fetchProfile. It uses fetch(`${api}/suppliers/${params.id}`). So let's use that path.
      
      const retryRes = await fetch(`${api}/suppliers/${params.id}/flag`, {
        method: 'POST'
      });
      
      if (retryRes.ok) {
        alert("Supplier flagged successfully.");
        setProfile((prev: any) => ({ ...prev, flagCount: (prev.flagCount || 0) + 1 }));
      } else {
        alert("Failed to flag supplier.");
      }
    } catch(err) {
      console.error(err);
      alert("Error flagging supplier.");
    } finally {
      setFlagging(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="animate-pulse">
          <div className="h-64 bg-muted w-full" />
          <div className="max-w-6xl mx-auto px-4 -mt-20 flex gap-6">
            <div className="w-40 h-40 bg-muted rounded-full border-4 border-background shrink-0" />
            <div className="flex-1 mt-20 pt-4 space-y-4">
              <div className="h-8 bg-muted rounded-xl w-1/3" />
              <div className="h-4 bg-muted rounded-full w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Supplier not found</div>

  const ts = profile.trustScore || 0
  let ringColor = "ring-gray-500"
  let colorClass = "text-gray-400"
  if (ts >= 80) { ringColor = "ring-emerald-500"; colorClass = "text-emerald-400" }
  else if (ts >= 50) { ringColor = "ring-amber-500"; colorClass = "text-amber-400" }
  else if (ts > 0) { ringColor = "ring-red-500"; colorClass = "text-red-400" }

  const verifiedCount = products.filter(p => p.status === "VERIFIED").length
  const totalSales = products.reduce((acc, p) => acc + (p.soldCount || 0), 0)

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 md:pb-12">
      <Header />

      {/* ── COVER GRADIENT ── */}
      <div className="h-48 md:h-64 bg-muted relative">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-24 md:-mt-32 relative z-10 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* ── AVATAR & TRUST SCORE ── */}
        <div className="flex flex-col items-center md:items-start shrink-0">
          <div className={`relative w-32 h-32 md:w-48 md:h-48 bg-card rounded-full flex items-center justify-center border-[6px] border-background shadow-2xl ring-4 ${ringColor}/30`}>
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={profile.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-4xl md:text-6xl font-bold bg-gradient-to-br from-primary to-orange-500 bg-clip-text text-transparent">
                {profile.name?.[0]?.toUpperCase() || "S"}
              </span>
            )}
            
            {/* Trust progress circle overlay */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" className="stroke-border" strokeWidth="4" />
              <circle cx="50" cy="50" r="48" fill="none" 
                className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`} 
                strokeWidth="4" strokeDasharray="301" strokeDashoffset={301 - (301 * ts) / 100} strokeLinecap="round" />
            </svg>
            
            <div className="absolute -bottom-2 md:-bottom-4 left-1/2 -translate-x-1/2 bg-background px-3 py-1 md:py-1.5 rounded-full border border-border flex items-center gap-1.5 shadow-xl whitespace-nowrap">
              <ShieldCheck className={`w-3.5 h-3.5 md:w-4 md:h-4 ${colorClass}`} />
              <span className={`text-xs md:text-sm font-bold ${colorClass}`}>{ts} Trust Score</span>
            </div>
          </div>
        </div>

        {/* ── HEADER INFO ── */}
        <div className="flex-1 mt-4 md:mt-36 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
                {profile.name}
                {profile.isVerified && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                )}
              </h1>
              <p className="text-[#9CA3AF] mt-2 mb-4 leading-relaxed max-w-2xl text-sm md:text-base">
                {profile.description || "A verified supplier on the Pramanik network. All products listed here are vetted by the community smart contracts."}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs md:text-sm text-muted-foreground font-medium">
                {profile.location && (
                  <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-lg">
                    <MapPin className="w-4 h-4" /> {profile.location}
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-lg">
                  <Calendar className="w-4 h-4" /> Joined 2024
                </div>
              </div>
            </div>
            
            {/* Desktop Message Button */}
            <div className="hidden md:flex shrink-0 gap-3 items-center">
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi ${profile.name}`} target="_blank" rel="noopener noreferrer">
                <button className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-bold rounded-xl px-6 py-3 transition-all flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Contact on WhatsApp
                </button>
              </a>
              <button 
                onClick={handleFlagSupplier}
                disabled={flagging}
                className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold rounded-xl px-6 py-3 transition-all flex items-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" /> {flagging ? "Flagging..." : "Flag Supplier"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="max-w-6xl mx-auto px-4 mt-8 md:mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Verified Products", value: verifiedCount, icon: Package, col: "text-orange-400", bg: "from-orange-500/10" },
            { label: "Community Trust", value: `${ts}%`, icon: ShieldCheck, col: colorClass, bg: "from-primary/10" },
            { label: "Total Sales", value: totalSales || "0", icon: CheckCircle2, col: "text-emerald-400", bg: "from-emerald-500/10" },
            { label: "Flags", value: profile.flagCount || 0, icon: AlertTriangle, col: "text-red-400", bg: "from-red-500/10" }
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} to-card border border-border rounded-2xl p-4 md:p-5 group relative`}>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 md:mb-3">{s.label}</div>
              <div className="flex items-end justify-between">
                <div className={`text-2xl md:text-3xl font-bold font-mono ${s.col}`}>{s.value}</div>
                <s.icon className={`w-6 h-6 ${s.col} opacity-50 group-hover:opacity-100 transition-opacity`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRODUCT GRID ── */}
      <div className="max-w-6xl mx-auto px-4 mt-12 md:mt-16">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            Storefront <span className="text-muted-foreground text-sm font-medium">({products.length})</span>
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No products yet</h3>
            <p className="text-muted-foreground max-w-md">This supplier hasn't listed any verified products on Pramanik yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard key={p.id} task={p} />
            ))}
          </div>
        )}
      </div>

      {/* ── MOBILE STICKY CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent md:hidden z-50">
        <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi ${profile.name}`} target="_blank" rel="noopener noreferrer">
          <button className="w-full bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 font-bold rounded-2xl h-14 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <MessageCircle className="w-5 h-5 fill-current" /> Contact Supplier
          </button>
        </a>
      </div>
    </div>
  )
}
