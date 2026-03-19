"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Wallet, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useWallet, useFreighterAvailable, useNetworkInfo } from "@/hooks/use-wallet"
import { NETWORK_LABELS } from '@/lib/constants'
import type { WalletType } from "@/lib/wallet-types"

interface WalletConnectorProps {
  onConnect?: () => void
  onDisconnect?: () => void
  className?: string
}

export function WalletConnector({ onConnect, onDisconnect, className }: WalletConnectorProps) {
  const {
    isConnected,
    publicKey,
    balance,
    isConnecting,
    error,
    walletType,
    connect,
    disconnect,
    refreshBalance,
  } = useWallet()

  const isFreighterAvailable = useFreighterAvailable()
  const { network, isTestnet } = useNetworkInfo()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleConnect = async (walletType: WalletType) => {
    try {
      await connect(walletType)
      onConnect?.()
    } catch (error) {
      }
  }

  const handleDisconnect = () => {
    disconnect()
    onDisconnect?.()
  }

  const handleRefreshBalance = async () => {
    setIsRefreshing(true)
    try {
      await refreshBalance()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isConnected) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connected
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {walletType}
            </Badge>
          </div>
          <CardDescription>

            {isTestnet ? "Testnet" : "Mainnet"} • {network}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Public Key</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="font-mono text-xs bg-muted p-2 rounded break-all">
              {publicKey}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Balance</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {balance.toFixed(4)} XLM
              </span>
              <Badge variant="secondary">
                {balance.toFixed(2)} USD
              </Badge>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Connect your wallet to interact with the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            onClick={() => handleConnect('freighter')}
            disabled={!isFreighterAvailable || isConnecting}
            className="w-full justify-start"
            variant="outline"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Freighter Wallet
            {!isFreighterAvailable && (
              <Badge variant="secondary" className="ml-auto">
                Not Installed
              </Badge>
            )}
          </Button>

          <Button
            onClick={() => handleConnect('albedo')}
            disabled={isConnecting}
            className="w-full justify-start"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Albedo Wallet
          </Button>

          <Button
            onClick={() => handleConnect('lobstr')}
            disabled={isConnecting}
            className="w-full justify-start"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            LOBSTR Vault
          </Button>
        </div>

        {!isFreighterAvailable && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Install Freighter wallet extension for the best experience.
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline"
              >
                Download here
              </a>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
