"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import type { RootState, AppDispatch } from "@/lib/redux/store"
import { logoutUser } from "@/lib/redux/slices/user-auth-slice"
import { disconnectWallet } from "@/lib/redux/slices/wallet-slice"
import { Button } from "@/components/ui/button"
import { Menu, X, ShieldCheck, MessageCircle, LogOut, User, ChevronDown, Lock, LayoutGrid, ShoppingBag } from "lucide-react"
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
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()

  const { isConnected, publicKey } = useSelector((state: RootState) => state.wallet)
  const { isAuthenticated, user } = useSelector((state: RootState) => state.userAuth)

  const isUserActive = isAuthenticated || isConnected

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const dismissed = window.sessionStorage.getItem("pramanik_guest_bar_dismissed") === "true"
    setShowGuestBar(!dismissed && !isAuthenticated)

    const handleOpenAuth = () => setAuthModalOpen(true)
    window.addEventListener('open-auth-modal', handleOpenAuth)
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth)
  }, [isAuthenticated])

  const isSupplier = isAuthenticated && user?.role === "SUPPLIER"

  const NAV: Array<{ href: string; label: string; requiresAuth?: boolean }> = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/community", label: "Community" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/bounty-board", label: "Bounties" },
    { href: "/verify", label: "Verify" },
  ]

  // Add role-based links
  if (isSupplier) {
    NAV.push(
      { href: "/seller-dashboard", label: "Dashboard" }
    )
  } else if (user?.role === "BUYER") {
    NAV.push({ href: "/buyer-dashboard", label: "My Orders" })
  }

  // Add wallet-based links if not already present
  if (isConnected && !NAV.some(n => n.href === "/buyer-dashboard")) {
    NAV.push({ href: "/buyer-dashboard", label: "My Orders" })
  }



  const handleLogout = () => {
    dispatch(logoutUser())
    dispatch(disconnectWallet())
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <>
      <USDCPriceTicker />
      {showGuestBar && !isUserActive && (
        <div className="border-b border-border bg-background/90 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              You are browsing as a guest. Sign in to verify products and access your dashboard.
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" className="h-8 rounded-lg" onClick={() => setAuthModalOpen(true)}>
                Supplier Login
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
              n.requiresAuth && !isUserActive ? (
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
            {isAuthenticated && !isConnected ? (
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
            ) : isConnected ? null : (
              <Button onClick={() => setAuthModalOpen(true)}
                variant="outline" className="rounded-xl h-9 text-sm font-medium transition-all">
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Supplier Login
              </Button>
            )}

            {isUserActive && <NotificationBell />}


            {isAuthenticated && user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-accent border border-border hover:bg-accent/70 rounded-xl px-3 py-2 text-sm transition-all">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                    {String(user.email?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="text-foreground/90 max-w-[80px] truncate">{String(user.email || "").split("@")[0]}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 rounded-2xl shadow-2xl w-52 py-2 z-50 border border-border bg-popover text-popover-foreground">
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl mx-1 transition-colors">
                      <User className="w-4 h-4" /> My Profile
                    </Link>
                    {isSupplier && (
                      <Link href="/seller-dashboard" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl mx-1 transition-colors">
                        <LayoutGrid className="w-4 h-4" /> Seller Dashboard
                      </Link>
                    )}
                    {isSupplier && (
                      <Link href="/whatsapp-setup" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl mx-1 transition-colors">
                        <MessageCircle className="w-4 h-4" /> WhatsApp Setup
                      </Link>
                    )}
                    {isConnected && (
                      <Link href="/buyer-dashboard" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl mx-1 transition-colors">
                        <ShoppingBag className="w-4 h-4" /> Buyer Dashboard
                      </Link>
                    )}
                    <div className="h-px bg-border my-1 mx-3" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 w-full text-left rounded-xl mx-1 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {isConnected && publicKey ? (
              <div className="flex items-center gap-1.5 bg-accent border border-border rounded-xl px-2 py-1.5">
                <div className="flex items-center gap-2 px-1.5 py-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span className="text-muted-foreground font-mono text-xs">{publicKey.slice(0, 6)}…{publicKey.slice(-4)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                  onClick={() => {
                    dispatch(disconnectWallet());
                    if (window.location.pathname.includes('dashboard')) router.push('/');
                  }} title="Disconnect Wallet">
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : !isAuthenticated ? (
              <Button onClick={() => setWalletSelectorOpen(true)} className="rounded-xl h-9 text-sm font-medium transition-all">
                Connect Wallet
              </Button>
            ) : null}
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
              n.requiresAuth && !isUserActive ? (
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
              {isUserActive ? (
                <>
                  <Link href={isSupplier ? "/seller-dashboard" : "/buyer-dashboard"} onClick={() => setMobileOpen(false)} className="block w-full">
                    <Button variant="outline" className="w-full rounded-2xl h-11">
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => {
                       handleLogout();
                       setMobileOpen(false);
                    }} 
                    variant="ghost" 
                    className="w-full rounded-2xl h-11 text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => { setAuthModalOpen(true); setMobileOpen(false) }}
                    variant="outline" className="w-full rounded-2xl h-11">
                    Supplier Login
                  </Button>
                  <Button onClick={() => { setWalletSelectorOpen(true); setMobileOpen(false) }}
                    className="w-full rounded-2xl h-11">
                    Connect Wallet
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <StellarWalletSelector isOpen={walletSelectorOpen} onClose={() => setWalletSelectorOpen(false)} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
