"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"

interface TestResult { name: string; status: "ok" | "fail" | "pending"; data?: any; error?: string }

const TESTS = [
  { name: "Health check", url: "/health" },
  { name: "Products (marketplace)", url: "/products?status=VERIFIED&limit=3" },
  { name: "Stats", url: "/stats" },
  { name: "Community queue", url: "/community/queue" },
  { name: "Leaderboard", url: "/community/leaderboard" },
  { name: "DEX quote (XLM→USDC)", url: "/payments/quote", method: "POST", body: { sourceCurrency: "XLM", targetUsdcAmount: "1.0" } },
]

export default function APITestPage() {
  const [results, setResults] = useState<TestResult[]>(TESTS.map(t => ({ name: t.name, status: "pending" })))
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  useEffect(() => {
    TESTS.forEach(async (test, i) => {
      try {
        const opts: RequestInit = test.method === "POST"
          ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(test.body) }
          : {}
        const res = await fetch(`${api}${test.url}`, opts)
        const data = await res.json()
        setResults(prev => {
          const next = [...prev]
          next[i] = { name: test.name, status: res.ok ? "ok" : "fail", data: data?.data || data }
          return next
        })
      } catch (e: any) {
        setResults(prev => {
          const next = [...prev]
          next[i] = { name: test.name, status: "fail", error: e.message }
          return next
        })
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">API Health Check</h1>
        <p className="text-slate-400 text-sm mb-6">Testing: <span className="font-mono text-blue-400">{api}</span></p>

        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className={`bg-slate-800 border rounded-2xl p-4 transition-colors ${
              r.status === "ok" ? "border-emerald-500/30" : r.status === "fail" ? "border-red-500/30" : "border-slate-700"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{r.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  r.status === "ok" ? "bg-emerald-500/10 text-emerald-400" :
                  r.status === "fail" ? "bg-red-500/10 text-red-400" :
                  "bg-slate-700 text-slate-400 animate-pulse"
                }`}>
                  {r.status === "pending" ? "testing..." : r.status.toUpperCase()}
                </span>
              </div>
              {r.error && <p className="text-red-400 text-xs font-mono">{r.error}</p>}
              {r.data && (
                <pre className="text-slate-400 text-xs overflow-x-auto bg-slate-900 rounded-lg p-2 mt-1">
                  {JSON.stringify(r.data, null, 2).slice(0, 200)}{JSON.stringify(r.data).length > 200 ? "..." : ""}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
