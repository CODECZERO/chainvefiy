"use client"

import * as React from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  ExternalLink, 
  User, 
  Calendar, 
  Package, 
  QrCode,
  Loader2,
  Search,
  ChevronRight
} from "lucide-react"
import { getSupplierOrders } from "@/lib/api-service"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function CustomerManager() {
  const [orders, setOrders] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null)

  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await getSupplierOrders()
        if (res.success) {
          setOrders(res.data)
        }
      } catch (error) {
        console.error("Failed to fetch supplier orders:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter(o => 
    o.buyer?.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.product?.title?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading customer records...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by buyer or product..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          {filteredOrders.length} Customers Found
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950/50">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Buyer</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Product</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Date</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-slate-200">{order.buyer?.email || "Anonymous Buyer"}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                        {order.buyer?.stellarWallet || "No wallet linked"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-300">{order.product?.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(order.createdAt), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`rounded-lg capitalize text-[10px] h-5 ${
                    order.status === 'DELIVERED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                    order.status === 'SHIPPED' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' :
                    'border-amber-500/30 text-amber-400 bg-amber-500/5'
                  }`}>
                    {order.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg hover:bg-primary/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg hover:bg-white/10 transition-all"
                      onClick={() => window.open(`/order/${order.id}/journey`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center text-slate-500 italic">
                  No customers found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-slate-950 border-white/10 text-white max-w-sm rounded-3xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-center font-bold text-xl flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              Order QR Code
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-primary/20">
                {selectedOrder.qrCodeUrl ? (
                  <img 
                    src={selectedOrder.qrCodeUrl} 
                    alt="Order QR Code" 
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs italic">
                    QR Code not generated
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-sm font-semibold text-slate-200">{selectedOrder.buyer?.email}</div>
                <div className="text-[10px] text-slate-500 font-mono tracking-tight uppercase">Order ID: {selectedOrder.id.slice(0, 12)}...</div>
              </div>

              <div className="grid grid-cols-1 w-full gap-3 mt-4">
                <Button 
                  className="w-full rounded-2xl h-12 font-bold bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  onClick={() => {
                    if (!selectedOrder.qrCodeUrl) return;
                    const a = document.createElement('a');
                    a.href = selectedOrder.qrCodeUrl;
                    a.download = `order-${selectedOrder.id.slice(0, 8)}-qr.png`;
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> Download for Print
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl h-12 border-white/10 hover:bg-white/5 text-slate-400"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>
              
              <p className="text-[9px] text-slate-600 text-center uppercase tracking-[0.2em] font-black mt-2">
                Secure Supply Chain Artifact
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
