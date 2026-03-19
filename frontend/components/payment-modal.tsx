"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"

export function PaymentModal({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean
  onClose: () => void
  product: { id: string; title: string; priceInr: number; priceUsdc: number }
}) {
  const { user } = useSelector((s: RootState) => s.userAuth)
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  const [currency, setCurrency] = React.useState<"USDC" | "XLM" | "BTC" | "ETH">("USDC")
  const [quote, setQuote] = React.useState<any>(null)
  const [loadingQuote, setLoadingQuote] = React.useState(false)
  const [paying, setPaying] = React.useState<null | "wallet" | "upi">(null)
  const [success, setSuccess] = React.useState<null | { txHash: string; orderId?: string }>(null)

  const targetUsdc = Number(product.priceUsdc || 0)

  React.useEffect(() => {
    if (!isOpen) {
      setCurrency("USDC")
      setQuote(null)
      setLoadingQuote(false)
      setPaying(null)
      setSuccess(null)
      return
    }

    const run = async () => {
      setLoadingQuote(true)
      try {
        const res = await fetch(`${api}/payments/quote`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCurrency: currency, targetUsdcAmount: targetUsdc }),
        })
        const json = await res.json()
        setQuote(res.ok ? json.data : null)
      } catch {
        setQuote(null)
      } finally {
        setLoadingQuote(false)
      }
    }

    run()
  }, [api, currency, isOpen, targetUsdc])

  const createOrder = async (opts: {
    paymentMethod: "STELLAR_USDC"
    sourceCurrency: string
    sourceAmount?: number
    escrowTxId: string
  }) => {
    if (!user?.id) throw new Error("Login required")
    const res = await fetch(`${api}/orders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        buyerId: user.id,
        quantity: 1,
        paymentMethod: opts.paymentMethod,
        sourceCurrency: opts.sourceCurrency,
        sourceAmount: opts.sourceAmount,
        escrowTxId: opts.escrowTxId,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.message || "Failed to create order")
    return json.data
  }

  const handleWalletPay = async () => {
    setPaying("wallet")
    try {
      // Placeholder: integrate real Stellar wallet signing later.
      const txHash = `mock_tx_${Math.random().toString(36).slice(2)}`
      const order = await createOrder({
        paymentMethod: "STELLAR_USDC",
        sourceCurrency: currency,
        sourceAmount: quote?.sourceAmount ? Number(quote.sourceAmount) : undefined,
        escrowTxId: txHash,
      })
      setSuccess({ txHash, orderId: order?.id })
    } finally {
      setPaying(null)
    }
  }

  const handleUpiPay = async () => {
    setPaying("upi")
    try {
      const initRes = await fetch(`${api}/payments/upi/initiate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInr: Number(product.priceInr),
          productId: product.id,
        }),
      })
      const initJson = await initRes.json()
      if (!initRes.ok) throw new Error(initJson?.message || "UPI initiation failed")

      // In real flow: Razorpay checkout + webhook confirmation.
      const txHash = `upi_mock_${initJson.data?.razorpayOrderId || Math.random().toString(36).slice(2)}`
      const order = await createOrder({
        paymentMethod: "STELLAR_USDC",
        sourceCurrency: "INR",
        sourceAmount: Number(product.priceInr),
        escrowTxId: txHash,
      })
      setSuccess({ txHash, orderId: order?.id })
    } finally {
      setPaying(null)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Checkout
          </DialogTitle>
          <DialogDescription>Payment is held in escrow and released after delivery confirmation.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div className="font-semibold">Payment created</div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                TX hash: <span className="font-mono">{success.txHash}</span>
              </div>
              <a
                className="text-sm text-primary hover:underline inline-flex items-center gap-2 mt-2"
                href={`https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(success.txHash)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Stellar Expert <ArrowRight className="w-4 h-4" />
              </a>
              {success.orderId && (
                <div className="text-xs text-muted-foreground mt-2">
                  Order recorded: <span className="font-mono">{success.orderId}</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{product.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">Product ID: {product.id}</div>
                </div>
                <Badge variant="secondary">Escrow</Badge>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-semibold">₹{Number(product.priceInr).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground font-mono">≈ {Number(product.priceUsdc).toFixed(4)} USDC</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pay with</div>
              <div className="grid grid-cols-4 gap-2">
                {(["USDC", "XLM", "BTC", "ETH"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      currency === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium">Quote</div>
              {loadingQuote ? (
                <div className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching quote…
                </div>
              ) : quote ? (
                <div className="mt-2 text-sm text-muted-foreground">
                  <div className="font-mono">
                    {quote.sourceAmount} {quote.sourceCurrency} → {quote.targetUsdc} USDC in escrow
                  </div>
                  <div className="mt-1 text-xs">
                    Rate: {quote.exchangeRate} · Fee: {quote.fee} USDC
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">No quote available.</div>
              )}
            </div>

            <div className="grid gap-2">
              <Button disabled={!quote || paying !== null || !user?.id} className="w-full" onClick={handleWalletPay}>
                {paying === "wallet" ? "Processing…" : "Pay with Stellar Wallet"}
              </Button>
              {!user?.id && <div className="text-xs text-muted-foreground">Sign in to complete checkout.</div>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

