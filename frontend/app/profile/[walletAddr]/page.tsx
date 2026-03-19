"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { ShieldCheck, MapPin, Package, Trophy, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { walletAddr } = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!walletAddr) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/user-profile/wallet/${walletAddr}`)
      .then(r => r.json())
      .then(d => setProfile(d.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddr])

  const shortAddr = walletAddr ? `${String(walletAddr).slice(0, 6)}...${String(walletAddr).slice(-4)}` : ""

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-slate-800 rounded-2xl" />
            <div className="h-64 bg-slate-800 rounded-2xl" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile header */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-bold shrink-0">
                  {profile.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold">{profile.supplierProfile?.name || profile.email?.split("@")[0]}</h1>
                    {profile.supplierProfile?.isVerified && (
                      <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-3 py-0.5 text-xs font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    <span className={`border rounded-full px-3 py-0.5 text-xs font-semibold ${
                      profile.role === "SUPPLIER" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>{profile.role}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-xs text-slate-400">{shortAddr}</span>
                    <a href={`https://stellar.expert/explorer/testnet/account/${walletAddr}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {profile.supplierProfile && (
                    <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5" />{profile.supplierProfile.location}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">{profile.totalTrustTokens}</div>
                  <div className="text-slate-500 text-xs">Trust Tokens</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-700 text-center">
                <div>
                  <div className="text-xl font-bold text-emerald-400">{profile.supplierProfile?.trustScore || 0}</div>
                  <div className="text-slate-500 text-xs">Trust Score</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{profile.buyerOrders?.length || 0}</div>
                  <div className="text-slate-500 text-xs">Orders</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{profile.supplierProfile?.totalSales || 0}</div>
                  <div className="text-slate-500 text-xs">Sales</div>
                </div>
              </div>
            </div>

            {/* Supplier Products */}
            {profile.supplierProfile?.products?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-blue-400" /> Verified Products</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {profile.supplierProfile.products.map((p: any) => (
                    <Link key={p.id} href={`/product/${p.id}`}
                      className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-2xl p-4 flex items-center gap-4 transition-colors">
                      <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center shrink-0"><Package className="w-6 h-6 text-slate-400" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-blue-400 font-mono text-sm mt-0.5">₹{p.priceInr}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            {profile.buyerOrders?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Recent Orders</h2>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                  {profile.buyerOrders.slice(0, 5).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{o.product?.title || "Product"}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-400 font-mono text-sm">{Number(o.priceUsdc).toFixed(4)} USDC</div>
                        <div className="text-slate-500 text-xs">{o.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No profile found for this wallet address.</p>
            <p className="text-sm mt-1 font-mono">{shortAddr}</p>
          </div>
        )}
      </div>
    </div>
  )
}
