"use client"

import { useState } from "react"
import { useWallet, useFreighterAvailable } from "@/hooks/use-wallet"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"
import { WalletSelector } from "./wallet-selector"

interface ConnectButtonProps {
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ConnectButton({ 
  label = "Connect Wallet", 
  variant = "outline",
  size = "default",
  className = ""
}: ConnectButtonProps) {
  const { isConnecting, isConnected, connect } = useWallet()
  const isFreighterAvailable = useFreighterAvailable()
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false)

  const handleConnect = async () => {
    try {
      if (isFreighterAvailable) {
        // Connect using Freighter - requestAccess is handled in wallet-slice
        await connect('freighter')
      } else {
        // Show wallet selector if Freighter is not available
        setWalletSelectorOpen(true)
      }
    } catch (error) {
      // Show wallet selector as fallback
      setWalletSelectorOpen(true)
    }
  }

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={isConnecting || isConnected}
        variant={variant}
        size={size}
        className={className}
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4 mr-2" />
        )}
        {isConnecting ? "Connecting..." : (isConnected ? "Connected" : label)}
      </Button>

      <WalletSelector 
        isOpen={walletSelectorOpen} 
        onClose={() => setWalletSelectorOpen(false)} 
      />
    </>
  )
}


