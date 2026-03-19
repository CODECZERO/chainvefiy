"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from "@/lib/redux/store"
import { connectWallet } from "@/lib/redux/slices/wallet-slice"
import { WalletType } from "@/lib/wallet-types"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X, Shield, Wallet, KeyRound } from "lucide-react"

interface StellarWalletSelectorProps {
    isOpen: boolean
    onClose: () => void
}

export function StellarWalletSelector({ isOpen, onClose }: StellarWalletSelectorProps) {
    const dispatch = useDispatch<AppDispatch>()
    const { isConnecting, error } = useSelector((state: RootState) => state.wallet)

    const wallets: { id: WalletType; name: string; icon: any; description: string }[] = [
        {
            id: "freighter",
            name: "Freighter",
            icon: Shield,
            description: "Stellar's official browser wallet",
        },
        {
            id: "albedo",
            name: "Albedo",
            icon: KeyRound,
            description: "Web-based Stellar signer",
        },
        {
            id: "ledger",
            name: "Ledger",
            icon: Wallet,
            description: "Hardware wallet support",
        }
    ]

    const handleConnect = async (walletId: WalletType) => {
        try {
            await dispatch(connectWallet(walletId)).unwrap()
            onClose()
        } catch (err) {
            }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-950 border border-zinc-800 text-white rounded-lg max-w-md p-0 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <DialogHeader className="p-6 pt-8 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent">
                    <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-amber-400" />
                        Connect Wallet
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-sm mt-1">
                        Choose a wallet provider to connect to AidBridge.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 space-y-2">
                    {wallets.map((wallet) => (
                        <button
                            key={wallet.id}
                            onClick={() => handleConnect(wallet.id)}
                            disabled={isConnecting}
                            className="group w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/50 rounded-md transition-all duration-200 disabled:opacity-50 text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-zinc-950 border border-zinc-700 group-hover:border-amber-500/50 rounded-md transition-colors">
                                    <wallet.icon className="h-5 w-5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                </div>
                                <div>
                                    <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                                        {wallet.name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {wallet.description}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="px-4 pb-4">
                        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-md text-red-400 text-xs">
                            {error}
                        </div>
                    </div>
                )}

                {isConnecting && (
                    <div className="absolute inset-0 bg-zinc-950/90 flex items-center justify-center z-50 rounded-lg">
                        <div className="text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-amber-400 mx-auto mb-4" />
                            <div className="text-amber-400 font-medium text-sm">
                                Connecting wallet...
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-3 bg-zinc-900/30 border-t border-zinc-800 text-[10px] text-zinc-600 text-center tracking-wide">
                    Secured by Stellar Network
                </div>
            </DialogContent>
        </Dialog>
    )
}
