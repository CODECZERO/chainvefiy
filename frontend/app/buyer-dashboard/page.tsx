"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/lib/wallet-context"
import { WalletRequirement } from "@/components/wallet-requirement"
import { Loader2, Package, QrCodeIcon, ScanLine, ArrowRight } from "lucide-react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"

export default function BuyerDashboard() {
  const { publicKey } = useWallet()
  const { user } = useSelector((s: RootState) => s.userAuth)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrders() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/my-orders?buyerId=${user.id}`);
        const data = await response.json();
        if (response.ok) {
          setOrders(data.data || [])
        }
      } catch (err) {
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [user?.id])

  if (!user?.id && !publicKey) {
     return (
       <div className="min-h-screen bg-background text-foreground">
          <Header />
          <div className="max-w-4xl mx-auto px-4 py-10">
             <WalletRequirement fallbackMessage="Please login or connect your wallet to view order history." />
          </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Buyer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Order history and delivery verifications.</p>

        {loading ? (
          <div className="flex justify-center mt-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 mt-8 text-center border-dashed">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No active orders</h3>
            <p className="text-muted-foreground mt-1">When you purchase an item, your delivery QR Handshake will appear here.</p>
          </Card>
        ) : (
          <div className="grid gap-6 mt-8">
            {orders.map((order, i) => (
              <Card key={i} className="p-6 flex flex-col md:flex-row gap-6 overflow-hidden relative border-border">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{order.product?.title || "Unknown Product"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Supplier: {order.product?.supplier?.name || "Unknown"}</p>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
                      {order.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-muted/50 p-4 rounded-xl">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Amount</p>
                      <p className="font-medium font-mono text-lg">₹{order.priceInr}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Date</p>
                      <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {order.status === "PAID" || order.status === "SHIPPED" || order.status === "DELIVERED" ? (
                    <div className="flex flex-col gap-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                      <div className="flex items-start gap-4 text-amber-500">
                        <ScanLine className="w-8 h-8 shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-sm">Delivery & Tracking</p>
                          <p className="text-xs mt-1 opacity-90 leading-relaxed text-zinc-400">
                            {order.status === "DELIVERED" 
                              ? "You have a 72-hour window to inspect the item and report any issues."
                              : "Track your package journey. You will need to confirm receipt here once it arrives."}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => window.open(`/delivery/confirm/${order.id}`, "_blank")}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20"
                      >
                        Track & Confirm Delivery <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  ) : order.deliveryCertCid || order.status === "COMPLETED" ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4 text-emerald-500 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                        <Package className="w-8 h-8 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Delivery Confirmed</p>
                          <p className="text-xs mt-1 opacity-90">Transaction completed and anchored to Stellar.</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full flex gap-2 border-zinc-700 hover:bg-zinc-800" onClick={() => window.open(`/proof/${order.id}`, "_blank")}>
                        View Public Certificate <ArrowRight className="w-4 h-4 text-zinc-400" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* QR Code Section */}
                {(order.status === "PAID" || order.status === "SHIPPED") && order.qrSupplierToken && (
                  <div className="shrink-0 w-full md:w-56 flex flex-col items-center justify-center py-6 bg-white rounded-2xl border shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(JSON.stringify({ orderId: order.id, token: order.qrSupplierToken }))}`} 
                      alt="Delivery QR Code" 
                      className="w-[150px] h-[150px]" 
                    />
                    <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-zinc-800 uppercase tracking-widest">
                      <QrCodeIcon className="w-4 h-4" /> Supplier Scan
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
