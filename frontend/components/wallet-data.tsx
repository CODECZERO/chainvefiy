"use client"

import React from "react"
import { useMounted } from "@/hooks/use-mounted"
import { ConnectButton } from "./connect-button"
import { useWallet } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, RefreshCw } from "lucide-react"

export function WalletData() {
  const mounted = useMounted()
  const { isConnected, publicKey, balance, walletType, disconnect, refreshBalance } = useWallet()

  const handleDisconnect = () => {
    disconnect()
  }

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!isConnected || !publicKey) {
    return <ConnectButton label="Connect Wallet" />
  }

  return (
    <div className="flex items-center gap-3">
      {/* Account Info */}
      <div className="text-right hidden sm:block">
        <p className="text-xs text-muted-foreground">Balance</p>
        <p className="text-sm font-semibold text-foreground">{balance.toFixed(4)} XLM</p>
      </div>
      
      {/* Wallet Type Badge */}
      {walletType && (
        <div className="text-xs text-muted-foreground hidden sm:block px-2 py-1 bg-gray-100 rounded">
          {walletType.charAt(0).toUpperCase() + walletType.slice(1)}
        </div>
      )}

      {/* Account Display */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-medium">
            {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
          </span>
        </div>
        
        <Button
          onClick={refreshBalance}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          title="Refresh Balance"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          title="Disconnect Wallet"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
