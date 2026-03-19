"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Loader2, AlertCircle, Wallet, ArrowRight } from "lucide-react"
import * as apiService from "@/lib/api-service"
import { useWallet } from "@/lib/wallet-context"
import { getExchangeRate, convertRsToXlm } from "@/lib/exchange-rates"

interface WalletTransferModalProps {
  isOpen: boolean
  onClose: () => void
  task: any
}

export function WalletTransferModal({ isOpen, onClose, task }: WalletTransferModalProps) {
  const { isConnected, publicKey } = useWallet()
  const [step, setStep] = useState<"amount" | "confirm" | "success" | "error">("amount")
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")
  const [exchangeRate, setExchangeRate] = useState(15)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [ipfsCid, setIpfsCid] = useState("")

  const presetAmounts = [100, 500, 1000, 2000]
  const stellarAmount = amount ? convertRsToXlm(Number.parseFloat(amount), exchangeRate) : 0

  useEffect(() => {
    const fetchRate = async () => {
      setIsLoadingRate(true)
      const rate = await getExchangeRate()
      setExchangeRate(rate)
      setIsLoadingRate(false)
    }

    fetchRate()
    const interval = setInterval(fetchRate, 30000)

    return () => clearInterval(interval)
  }, [])

  // Get task ID from different possible field names
  const getTaskId = () => {
    return task?._id || task?.id || task?.Id || ""
  }

  // Get task title from different possible field names
  const getTaskTitle = () => {
    return task?.Title || task?.title || "Task"
  }

  // Get receiver wallet address
  const getReceiverAddress = () => {
    return task?.WalletAddr || task?.walletAddr || ""
  }

  const handleConfirm = async () => {
    const taskId = getTaskId()
    const receiverAddress = getReceiverAddress()
    
    if (!taskId) {
      setError("Task ID not found")
      setStep("error")
      return
    }

    if (!receiverAddress) {
      setError("Receiver wallet address not found")
      setStep("error")
      return
    }

    if (!isConnected || !publicKey) {
      setError("Please connect your wallet first")
      setStep("error")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      // Generate a mock IPFS CID for the transaction metadata
      const mockCid = `Qm${Date.now()}${Math.random().toString(36).substr(2, 9)}`
      setIpfsCid(mockCid)

      // Call wallet-to-wallet payment API
      const walletPayResponse = await apiService.walletPay({
        PublicKey: receiverAddress,
        PostId: taskId,
        Amount: Number.parseFloat(amount),
        Cid: mockCid,
      })

      if (!walletPayResponse.success) {
        throw new Error(walletPayResponse.message || "Wallet transfer failed")
      }

      // Generate a mock transaction hash for display
      const mockTxHash = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setTxHash(mockTxHash)
      setStep("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet transfer failed"
      setError(message)
      setStep("error")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep("amount")
    setAmount("")
    setTxHash("")
    setError("")
    setIpfsCid("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {step === "amount" && "Wallet to Wallet Transfer"}
            {step === "confirm" && "Confirm Transfer"}
            {step === "success" && "Transfer Successful"}
            {step === "error" && "Transfer Failed"}
          </DialogTitle>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-4">
            {!isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">Please connect your wallet to transfer funds</p>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-800">Supplier Wallet Transfer</p>
              </div>
              <p className="text-xs text-orange-700">
                Transfer funds directly from your wallet to the supplier wallet address
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2"
                disabled={!isConnected}
              />
              {amount && (
                <div className="mt-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Stellar Equivalent</p>
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      {isLoadingRate ? <span className="animate-pulse">Updating...</span> : <span>Live Rate</span>}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 transition-all duration-300">
                    {stellarAmount.toFixed(4)} XLM
                  </p>
                  <p className="text-xs text-muted-foreground">1 XLM = ₹{exchangeRate.toFixed(2)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Quick amounts</p>
              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === preset.toString() ? "default" : "outline"}
                    onClick={() => setAmount(preset.toString())}
                    className="text-sm"
                    disabled={!isConnected}
                  >
                    ₹{preset}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep("confirm")}
              disabled={!amount || !isConnected}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Continue
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Amount (INR)</p>
              <p className="text-2xl font-bold text-foreground">₹{amount}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-muted-foreground">Amount (Stellar)</p>
              <p className="text-2xl font-bold text-orange-600">{stellarAmount.toFixed(4)} XLM</p>
              <p className="text-xs text-muted-foreground mt-2">Exchange Rate: 1 XLM = ₹{exchangeRate.toFixed(2)}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Task</p>
              <p className="font-semibold text-foreground">{getTaskTitle()}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Receiver Address</p>
              <p className="font-mono text-xs text-foreground break-all">
                {getReceiverAddress()}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Your Wallet</p>
              <p className="font-mono text-xs text-foreground break-all">
                {publicKey}
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <ArrowRight className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">Direct wallet-to-wallet transfer</p>
            </div>

            <Button onClick={handleConfirm} disabled={isProcessing} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                "Confirm Transfer"
              )}
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Transfer Amount</p>
              <p className="text-3xl font-bold text-foreground">₹{amount}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-muted-foreground">Stellar Amount</p>
              <p className="text-2xl font-bold text-orange-600">{stellarAmount.toFixed(4)} XLM</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
              <p className="font-mono text-xs text-foreground break-all">{txHash}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Wallet-to-wallet transfer completed successfully!
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">IPFS CID</p>
              <p className="font-mono text-xs text-foreground break-all">{ipfsCid}</p>
            </div>

            <div className="space-y-2">
              <Button onClick={handleClose} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Done
              </Button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Transfer Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={() => setStep("confirm")} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Try Again
              </Button>
              <Button onClick={handleClose} variant="outline" className="w-full border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
