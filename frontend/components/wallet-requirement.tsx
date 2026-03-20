"use client"

import React from "react"
import { useWallet } from "@/lib/wallet-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, CheckCircle } from "lucide-react"

interface WalletRequirementProps {
  children?: React.ReactNode
  fallbackMessage?: string
  className?: string
}

export function WalletRequirement({ children, fallbackMessage = "Please connect your wallet to access this feature.", className = "" }: WalletRequirementProps) {
  const { publicKey, connect, isConnecting } = useWallet()

  if (publicKey) {
    return <>{children}</>
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[40vh] space-y-4 ${className}`}>
      <Card className="p-8 max-w-md w-full text-center space-y-6 border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Wallet Required</h3>
          <p className="text-muted-foreground text-sm">
            {fallbackMessage}
          </p>
        </div>
        
        <div className="space-y-3 pt-4">
          <Button 
            className="w-full h-12 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white" 
            onClick={() => connect('freighter')}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Connect Freighter
              </span>
            )}
          </Button>
          <Button 
            variant="outline"
            className="w-full h-12 text-sm font-semibold border-zinc-700 hover:bg-zinc-800" 
            onClick={() => connect('albedo')}
            disabled={isConnecting}
          >
            Connect Albedo
          </Button>
        </div>
      </Card>
    </div>
  )
}
