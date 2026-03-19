"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/lib/redux/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Shield, Activity, RefreshCw } from "lucide-react"

interface RegistryEntry {
    name: string
    division: number
    rank: string
    powerLevel: number
    owner: string
    timestamp: string
}

export function SupplierRegistry() {
    const { isConnected, publicKey } = useSelector((state: RootState) => state.wallet)
    const [entries, setEntries] = useState<RegistryEntry[]>([])
    const [isRegistering, setIsRegistering] = useState(false)
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "fail">("idle")
    const [txHash, setTxHash] = useState<string | null>(null)

    useEffect(() => {
        setEntries([])
    }, [])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isConnected) return

        setIsRegistering(true)
        setStatus("pending")
        // Real transaction logic would call wallet-slice signTransaction
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Registration Form */}
            <div className="lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-5">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md">
                    <Activity className="h-3 w-3 text-green-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                        Network: {process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET'}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                    <Shield className="h-5 w-5 text-amber-400" />
                    Register on Chain
                </h3>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">Display Name</label>
                        <Input
                            name="reaperName"
                            placeholder="Enter your name"
                            className="bg-zinc-950 border-zinc-800 rounded-md focus:border-amber-500 text-white font-mono text-sm"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">Product Category (1-13)</label>
                        <Input
                            name="division"
                            type="number"
                            min="1"
                            max="13"
                            defaultValue="1"
                            className="bg-zinc-950 border-zinc-800 rounded-md focus:border-amber-500 text-white font-mono text-sm"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={!isConnected || isRegistering}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-md h-11"
                    >
                        {isRegistering ? <Loader2 className="animate-spin" /> : "Register on Blockchain"}
                    </Button>

                    {!isConnected && (
                        <p className="text-xs text-amber-400 text-center">
                            Connect your wallet to access the registry
                        </p>
                    )}
                </form>

                {status !== "idle" && (
                    <div className={`p-3 border rounded-md text-xs ${status === "success" ? "bg-green-950/20 border-green-900/50 text-green-400" :
                        status === "pending" ? "bg-amber-950/20 border-amber-900/50 text-amber-400" :
                            "bg-red-950/20 border-red-900/50 text-red-400"
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                            <span>Status: {status}</span>
                            {status === "pending" && <RefreshCw className="h-3 w-3 animate-spin" />}
                        </div>
                        {txHash && (
                            <div className="break-all font-mono text-[10px]">
                                Hash: <span className="underline cursor-pointer">{txHash}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Registry Feed */}
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-amber-400" />
                        Registry Feed
                    </h3>
                    <div className="text-[10px] font-mono text-zinc-500">
                        Syncing with Stellar...
                    </div>
                </div>

                <div className="divide-y divide-zinc-800">
                    {entries.length === 0 && (
                        <div className="p-12 text-center text-zinc-500 text-sm">
                            No entries yet. Be the first to register!
                        </div>
                    )}
                    {entries.map((entry, i) => (
                        <div key={i} className="p-4 hover:bg-zinc-900/30 transition-colors group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-md flex items-center justify-center font-bold text-amber-400">
                                        {entry.division}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white group-hover:text-amber-400 transition-colors">
                                            {entry.name}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            Rank: {entry.rank} | Level: {entry.powerLevel}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-zinc-600 uppercase">
                                        Verified
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500">
                                        {entry.timestamp}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
