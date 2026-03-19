"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import * as StellarSdk from 'stellar-sdk'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    title: string
    WalletAddr: string
    _id: string
  }
  onSuccess?: (txHash: string) => void
}

export function DonationModal({ isOpen, onClose, task, onSuccess }: DonationModalProps) {
  const [amount, setAmount] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDonate = async () => {
    try {
      if (!secretKey) {
        setError("Please enter your secret key")
        return
      }

      setLoading(true)
      setError(null)

      // Initialize the Stellar SDK
      const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org")
      const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey)
      const sourcePublicKey = sourceKeypair.publicKey()

      // Load the source account
      const sourceAccount = await server.loadAccount(sourcePublicKey)

      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: task.WalletAddr,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .setTimeout(30)
        .build()

      // Sign the transaction with the source account's secret key
      transaction.sign(sourceKeypair)

      // Submit the transaction
      const transactionResult = await server.submitTransaction(transaction)

      if (onSuccess) {
        onSuccess(transactionResult.hash)
      }
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to process donation")
    } finally {
      setLoading(false)
      // Clear secret key for security
      setSecretKey("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Donate to {task.title}</DialogTitle>
          <DialogDescription>
            Enter your donation details to complete the transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (XLM)</label>
            <Input
              type="number"
              placeholder="Amount in XLM"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.0001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Your Secret Key</label>
            <Input
              type="password"
              placeholder="Enter your Stellar secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Never share your secret key. This is only used to sign the transaction.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            Recipient Address:
            <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
              {task.WalletAddr}
            </code>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
            Cancel
          </Button>
          <Button 
            onClick={handleDonate} 
            disabled={loading || !amount || !secretKey}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Donation'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}