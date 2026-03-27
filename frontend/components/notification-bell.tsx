"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, CheckCheck, Package, ShieldCheck, Wallet } from "lucide-react"

const ICONS: Record<string, any> = {
  PRODUCT_VERIFIED: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  PRODUCT_FLAGGED: <Package className="w-4 h-4 text-red-400" />,
  ORDER_RECEIVED: <Package className="w-4 h-4 text-blue-400" />,
  PAYMENT_RELEASED: <Wallet className="w-4 h-4 text-emerald-400" />,
  PAYMENT_REFUNDED: <Wallet className="w-4 h-4 text-red-400" />,
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUnread()
    // Close on outside click
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const fetchUnread = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/unread-count`, { credentials: "include" })
      const data = await res.json()
      setUnread(data.data?.count || 0)
    } catch {}
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, { credentials: "include" })
      const data = await res.json()
      setNotifications(data.data || [])
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, { method: "PATCH", credentials: "include" })
      setUnread(0)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) { fetchNotifications(); if (unread > 0) markAllRead() }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="font-semibold text-sm">Notifications</span>
            {notifications.some(n => !n.isRead) && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No notifications yet</div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-slate-700/50 flex gap-3 ${!n.isRead ? "bg-slate-700/30" : ""}`}>
                  <div className="mt-0.5 shrink-0">{ICONS[n.type] || <Bell className="w-4 h-4 text-slate-400" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{String(n.title || "")}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{String(n.body || "")}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
