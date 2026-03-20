"use client"
import { useEffect, useState } from "react"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

export function OrdersList({ buyerId }: { buyerId?: string }) {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (!buyerId) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/donations/buyer/${buyerId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setOrders(d.data || []))
      .catch(() => {})
  }, [buyerId])

  if (!orders.length) return <p className="text-slate-400 text-sm">No orders yet.</p>

  return (
    <div className="space-y-3">
      {orders.map(o => (
        <div key={o.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{o.product?.title || "Product"}</div>
            <div className="text-slate-500 text-xs mt-0.5">{new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-blue-400 text-sm">{Number(o.priceUsdc).toFixed(4)} USDC</div>
            <div className="text-slate-500 text-xs">{o.status}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
