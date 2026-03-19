"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { submitDonationTransaction } from "@/lib/stellar-utils"
import { useWallet } from "@/lib/wallet-context"
import { getExchangeRate, convertRsToXlm } from "@/lib/exchange-rates"
import { verifyDonation } from "@/lib/api-service"

interface SimpleDonateModalProps {
  isOpen: boolean
  onClose: () => void
  task: any
}

export function SimpleDonateModal({ isOpen, onClose, task }: SimpleDonateModalProps) {
  const { isConnected, publicKey, signTransaction } = useWallet()
  const [step, setStep] = useState<"amount" | "confirm" | "success" | "error">("amount")
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")
  const [exchangeRate, setExchangeRate] = useState(15)
  const [isLoadingRate, setIsLoadingRate] = useState(false)

  const presetAmounts = [50, 100, 200, 500]
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
    // Debug log
    return task?._id || task?.id || task?.Id || ""
  }

  // Get task title from different possible field names
  const getTaskTitle = () => {
    return task?.Title || task?.title || "Task"
  }

  const handleConfirm = async () => {
    const taskId = getTaskId()
    const receiverAddress = task?.WalletAddr || task?.walletAddr || ""

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
      // Create real Stellar transaction (arg order: publicKey, receiver, amount, taskId, signTransaction)
      const result = await submitDonationTransaction(
        publicKey,
        receiverAddress,
        stellarAmount.toFixed(7),
        taskId,
        signTransaction
      )

      if (!result.success) {
        throw new Error("Transaction failed")
      }

      // Verify donation with backend using payment API
      const verifyResponse = await verifyDonation({
        transactionId: result.hash,
        postId: taskId,
        amount: Number.parseFloat(amount),
        donorId: publicKey,
      })

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || "Failed to verify donation")
      }

      setTxHash(result.hash)
      setStep("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed"
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
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "amount" && "Enter Donation Amount"}
            {step === "confirm" && "Confirm Donation"}
            {step === "success" && "Donation Successful"}
            {step === "error" && "Donation Failed"}
          </DialogTitle>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-4">
            {!isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">Please connect your wallet to donate</p>
              </div>
            )}

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
                <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Stellar Equivalent</p>
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      {isLoadingRate ? <span className="animate-pulse">Updating...</span> : <span>Live Rate</span>}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 transition-all duration-300">
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

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-muted-foreground">Amount (Stellar)</p>
              <p className="text-2xl font-bold text-blue-600">{stellarAmount.toFixed(4)} XLM</p>
              <p className="text-xs text-muted-foreground mt-2">Exchange Rate: 1 XLM = ₹{exchangeRate.toFixed(2)}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Task</p>
              <p className="font-semibold text-foreground">{getTaskTitle()}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Receiver Address</p>
              <p className="font-mono text-xs text-foreground break-all">
                {task?.WalletAddr || task?.walletAddr || "Not found"}
              </p>
            </div>

            <Button onClick={handleConfirm} disabled={isProcessing} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Transaction...
                </>
              ) : (
                "Sign with Wallet"
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
              <p className="text-sm text-muted-foreground">Donation Amount</p>
              <p className="text-3xl font-bold text-foreground">₹{amount}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
              <p className="font-mono text-xs text-foreground break-all">{txHash}</p>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                View on Stellar Expert
              </a>
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
                <p className="font-semibold text-red-900">Donation Failed</p>
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
