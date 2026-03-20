"use client"

import * as React from "react"
import Link from "next/link"
import { useSelector, useDispatch } from "react-redux"
import type { RootState, AppDispatch } from "@/lib/redux/store"
import { logoutUser } from "@/lib/redux/slices/user-auth-slice"
import { Button } from "@/components/ui/button"
import { Menu, X, ShieldCheck, MessageCircle, LogOut, User, ChevronDown, Lock } from "lucide-react"
import dynamic from "next/dynamic"
 
 const StellarWalletSelector = dynamic(() => import("./stellar/wallet-selector").then(m => m.StellarWalletSelector), { ssr: false })
 const AuthModal = dynamic(() => import("./auth-modal").then(m => m.AuthModal), { ssr: false })
 const NotificationBell = dynamic(() => import("./notification-bell").then(m => m.NotificationBell), { ssr: false })
 const USDCPriceTicker = dynamic(() => import("./usdc-price-ticker").then(m => m.USDCPriceTicker), { ssr: false })



export function Header() {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [walletSelectorOpen, setWalletSelectorOpen] = React.useState(false)
  const [authModalOpen, setAuthModalOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [showGuestBar, setShowGuestBar] = React.useState(false)
  const dispatch = useDispatch<AppDispatch>()

  const { isConnected, publicKey } = useSelector((state: RootState) => state.wallet)
  const { isAuthenticated, user } = useSelector((state: RootState) => state.userAuth)

  const isUserActive = isAuthenticated || isConnected

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const dismissed = window.sessionStorage.getItem("pramanik_guest_bar_dismissed") === "true"
    setShowGuestBar(!dismissed && !isAuthenticated)
  }, [isAuthenticated])

  const NAV: Array<{ href: string; label: string; requiresAuth?: boolean }> = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/community", label: "Community" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/verify", label: "Verify", requiresAuth: true },
    { href: "/bounty-board", label: "Bounties", requiresAuth: true },
    ...(isAuthenticated && user?.role === "SUPPLIER" ? [{ href: "/seller-dashboard", label: "Sell" }] : []),
  ]



  const handleLogout = () => {
    dispatch(logoutUser())
    setUserMenuOpen(false)
  }

  return (
    <>
      <USDCPriceTicker />
      {showGuestBar && !isAuthenticated && (
        <div className="border-b border-border bg-background/90 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              You are browsing as a guest. Sign in to verify products and access your dashboard.
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" className="h-8 rounded-lg" onClick={() => setAuthModalOpen(true)}>
                Sign in
              </Button>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (typeof window !== "undefined") window.sessionStorage.setItem("pramanik_guest_bar_dismissed", "true")
                  setShowGuestBar(false)
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-orange-500/25 transition-all">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground">Pramanik</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map((n) =>
              n.requiresAuth && !isAuthenticated ? (
                <button
                  key={n.href}
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent transition-all font-medium inline-flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {n.label}
                </button>
              ) : (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent transition-all font-medium"
                >
                  {n.label}
                </Link>
              ),
            )}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated ? (
              user?.role === 'SUPPLIER' ? (
                <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-xl h-9 text-sm font-medium transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Sell on WhatsApp
                  </Button>
                </a>
              ) : (
                <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=REGISTER`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-xl h-9 text-sm font-medium transition-all">
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Become a Supplier
                  </Button>
                </a>
              )
            ) : (
              <Button onClick={() => setAuthModalOpen(true)}
                variant="outline" className="rounded-xl h-9 text-sm font-medium transition-all">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Sign In to Sell
              </Button>
            )}

            {isUserActive && <NotificationBell />}


            {isAuthenticated && user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-accent border border-border hover:bg-accent/70 rounded-xl px-3 py-2 text-sm transition-all">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-foreground/90 max-w-[80px] truncate">{user.email?.split("@")[0]}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 rounded-2xl shadow-2xl w-52 py-2 z-50 border border-border bg-popover text-popover-foreground">
                    <Link href="/seller-dashboard" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl mx-1 transition-colors">
                      <User className="w-4 h-4" /> Dashboard
                    </Link>
                    <div className="h-px bg-border my-1 mx-3" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 w-full text-left rounded-xl mx-1 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)}
                variant="outline" className="rounded-xl h-9 text-sm font-medium transition-all">
                Sign In
              </Button>
            )}

            {isConnected && publicKey ? (
              <div className="flex items-center gap-2 bg-accent border border-border rounded-xl px-3 py-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-muted-foreground font-mono text-xs">{publicKey.slice(0, 6)}…{publicKey.slice(-4)}</span>
              </div>
            ) : (
              <Button onClick={() => setWalletSelectorOpen(true)} className="rounded-xl h-9 text-sm font-medium transition-all">
                Connect Wallet
              </Button>
            )}
          </div>

          {/* Mobile burger */}
          <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-4 space-y-1">
            {NAV.map((n) =>
              n.requiresAuth && !isAuthenticated ? (
                <button
                  key={n.href}
                  type="button"
                  onClick={() => {
                    setAuthModalOpen(true)
                    setMobileOpen(false)
                  }}
                  className="w-full text-left block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-2xl transition-all font-medium"
                >
                  <span className="inline-flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {n.label}
                  </span>
                </button>
              ) : (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-2xl transition-all font-medium"
                >
                  {n.label}
                </Link>
              ),
            )}
            <div className="pt-3 space-y-2">
              <Button onClick={() => { setAuthModalOpen(true); setMobileOpen(false) }}
                variant="outline" className="w-full rounded-2xl h-11">
                {isAuthenticated ? "Dashboard" : "Sign In"}
              </Button>
              <Button onClick={() => { setWalletSelectorOpen(true); setMobileOpen(false) }}
                className="w-full rounded-2xl h-11">
                Connect Wallet
              </Button>
            </div>
          </div>
        )}
      </header>

      <StellarWalletSelector isOpen={walletSelectorOpen} onClose={() => setWalletSelectorOpen(false)} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
