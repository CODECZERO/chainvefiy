"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Loader2, AlertCircle, Coins } from "lucide-react"
import { submitBountyTransaction } from "@/lib/stellar-utils"
import { useWallet } from "@/lib/wallet-context"
import { getExchangeRate, convertRsToXlm } from "@/lib/exchange-rates"
import { createBounty, verifyBountyPayment, initiateUPI } from "@/lib/api-service"
import { useSelector } from "react-redux"
import { RootState } from "@/lib/redux/store"

interface BountyModalProps {
  isOpen: boolean
  onClose: () => void
  product: any
}

export function BountyModal({ isOpen, onClose, product }: BountyModalProps) {
  const { isConnected, publicKey, signTransaction } = useWallet()
  const { user } = useSelector((s: RootState) => s.userAuth)
  
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success" | "error">("input")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")
  const [exchangeRate, setExchangeRate] = useState(15)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [bountyId, setBountyId] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [verifReason, setVerifReason] = useState("")
  const [checkingVerif, setCheckingVerif] = useState(false)

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

  useEffect(() => {
    if (isOpen && product?.id) {
      checkVerification()
    }
  }, [isOpen, product?.id])

  const checkVerification = async () => {
    setCheckingVerif(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verification/status?productId=${product.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      })
      const data = await res.json()
      if (data.success) {
        setIsVerified(data.data.isVerified)
        setVerifReason(data.data.reason)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingVerif(false)
    }
  }

  const handleCreateAndPay = async () => {
    if (!product?.id || !publicKey) {
      setError("Missing information (Product or Wallet connection)")
      setStep("error")
      return
    }

    setIsProcessing(true)
    setStep("processing")
    setError("")

    try {
      // 1. Create Bounty in Backend (PENDING)
      const createData: any = {
        productId: product.id,
        amount: Number.parseFloat(amount),
        description: description
      }
      if (user?.id) createData.issuerId = user.id
      else createData.stellarWallet = publicKey

      const bountyRes = await createBounty(createData)

      if (!bountyRes.success) {
        throw new Error(bountyRes.message || "Failed to initialize bounty")
      }

      const newBountyId = bountyRes.data.id
      setBountyId(newBountyId)

      // 2. Submit Stellar Transaction
      const receiverAddress = product.supplier?.stellarWallet || ""
      if (!receiverAddress) throw new Error("Supplier's wallet address not found")

      const result = await submitBountyTransaction(
        publicKey,
        receiverAddress,
        stellarAmount.toFixed(7),
        newBountyId,
        signTransaction
      )

      if (!result.success) {
        throw new Error("Transaction failed or was not verified")
      }

      setTxHash(result.hash)

      // 3. Verify Payment with Backend to Activate Bounty
      await verifyBountyPayment({
        bountyId: newBountyId,
        transactionHash: result.hash
      })

      setStep("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Process failed"
      setError(message)
      setStep("error")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManagedWalletBounty = async () => {
    if (!product?.id || !user?.id) {
      setError("Please log in to issue a bounty")
      setStep("error")
      return
    }

    if (!isVerified) {
      setError(verifReason || "You are not authorized to create a bounty for this product.")
      setStep("error")
      return
    }

    setIsProcessing(true)
    setStep("processing")
    setError("")

    try {
      // 1. Create Bounty with MANAGED_WALLET Payment Method
      const bountyRes = await createBounty({
        productId: product.id,
        issuerId: user.id,
        amount: Number.parseFloat(amount),
        description: description,
        // @ts-ignore
        paymentMethod: "INTERNAL" // Backend maps INTERNAL/MANAGED_WALLET to server-side signing
      })

      if (!bountyRes.success) throw new Error(bountyRes.message || "Failed to initialize bounty")
      const newBountyId = bountyRes.data.id

      // 2. Verify Payment (Backend handles the actual deduction/signing for INTERNAL)
      // @ts-ignore
      const res = await verifyBountyPayment({
        bountyId: newBountyId,
        transactionHash: "managed_wallet_auth", // Signal to backend to use managed secret
        paymentMethod: "INTERNAL"
      })

      if (!res.success) throw new Error(res.message || "Managed wallet payment failed")

      setTxHash(res.data.transactionHash || "internal_ledger_settled")
      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Managed wallet process failed")
      setStep("error")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpiBounty = async () => {
    if (!product?.id || !user?.id) {
      setError("Please log in to issue a bounty")
      setStep("error")
      return
    }

    setIsProcessing(true)
    setStep("processing")
    setError("")

    try {
      // 1. Initiate UPI Payment
      const initRes = await initiateUPI({
        amount: Number.parseFloat(amount),
        currency: "INR",
        type: "BOUNTY",
        productId: product.id
      })

      if (!initRes.success) throw new Error(initRes.message || "UPI initialization failed")

      // 2. Create Bounty with UPI Payment Method
      const bountyRes = await createBounty({
        productId: product.id,
        issuerId: user.id,
        amount: Number.parseFloat(amount),
        description: description,
        // @ts-ignore
        paymentMethod: "UPI"
      })

      if (!bountyRes.success) throw new Error(bountyRes.message || "Failed to initialize bounty")
      const newBountyId = bountyRes.data.id

      // 3. Verify Payment
      const mockHash = `upi_bounty_${initRes.data?.razorpayOrderId || Math.random().toString(36).slice(2)}`
      await verifyBountyPayment({
        bountyId: newBountyId,
        transactionHash: mockHash,
        // @ts-ignore
        paymentMethod: "UPI"
      })

      setTxHash(mockHash)
      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "UPI process failed")
      setStep("error")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep("input")
    setAmount("")
    setDescription("")
    setTxHash("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-[#111827] border-[#1F2D40] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Coins className="text-amber-500 w-6 h-6" />
            {step === "input" && "Issue Bounty"}
            {step === "confirm" && "Confirm Bounty"}
            {step === "processing" && "Processing"}
            {step === "success" && "Bounty Activated"}
            {step === "error" && "Action Failed"}
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 pt-4">
            {!isConnected && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">Connect wallet to issue a bounty</p>
              </div>
            )}

            {isConnected && !checkingVerif && !isVerified && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  {verifReason || "You must be a verified supplier (>5 sales) or have bought this product."}
                </p>
              </div>
            )}

            {checkingVerif && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking verification status...
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">What do you want to verify?</label>
              <Textarea
                placeholder="Ex: Show clear video of the harvesting process with a timestamped note."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#1C2333] border-[#1F2D40] text-white rounded-xl placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Reward Amount (₹)</label>
              <Input
                type="number"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-[#1C2333] border-[#1F2D40] text-white rounded-xl"
                disabled={!isConnected}
              />
              {amount && (
                <div className="mt-3 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20 space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                    <span>Stellar Equivalent</span>
                    <span>{isLoadingRate ? "Updating..." : "Live Rate"}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400 font-mono">
                    {stellarAmount.toFixed(4)} XLM
                  </p>
                  <p className="text-[10px] text-slate-500">1 XLM ≈ ₹{exchangeRate.toFixed(2)}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setStep("confirm")}
                disabled={!amount || !description || !isConnected || !isVerified}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl"
              >
                Stellar Pay (External Wallet)
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {user?.id && (
                  <>
                    <Button
                      onClick={() => handleUpiBounty()}
                      disabled={!amount || !description || !isVerified}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
                    >
                      UPI Pay
                    </Button>
                    {user?.role === 'SUPPLIER' && (
                      <Button
                        onClick={() => handleManagedWalletBounty()}
                        disabled={!amount || !description || !isVerified}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl"
                      >
                        Managed Wallet
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 pt-4">
            <div className="bg-[#1C2333] rounded-xl p-4 border border-[#1F2D40]">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Requesting Proof for</p>
              <p className="font-semibold text-white">{String(product?.title || "")}</p>
            </div>

            <div className="bg-[#1C2333] rounded-xl p-4 border border-[#1F2D40]">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{String(description || "")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1C2333] rounded-xl p-4 border border-[#1F2D40]">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Reward</p>
                <p className="text-xl font-bold text-white">₹{String(amount || 0)}</p>
              </div>
              <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                <p className="text-xs text-blue-400/70 uppercase tracking-widest font-bold mb-1">Stellar</p>
                <p className="text-xl font-bold text-blue-400 font-mono">{stellarAmount.toFixed(3)}</p>
              </div>
            </div>

            <Button onClick={handleCreateAndPay} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl">
              Confirm & Pay (Stellar)
            </Button>
            <Button onClick={() => setStep("input")} variant="ghost" className="w-full text-slate-400 hover:text-white">
              Back to Edit
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
            <div>
              <p className="text-lg font-bold">Processing Bounty</p>
              <p className="text-slate-400 text-sm">Please sign the transaction in your wallet...</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-6 pt-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white">Bounty Active!</h3>
              <p className="text-slate-400 text-sm mt-1">Sellers and verifiers will now see your request.</p>
            </div>

            <div className="bg-[#1C2333] rounded-xl p-4 text-left border border-[#1F2D40]">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Transaction</p>
              <p className="font-mono text-xs text-slate-300 break-all">{String(txHash || "")}</p>
              <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                 className="text-amber-500 hover:text-amber-400 text-xs font-semibold mt-2 inline-block transition-colors">
                View on Stellar Expert →
              </a>
            </div>

            <Button onClick={handleClose} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 rounded-xl">
              Done
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-6 pt-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-400">Action Failed</p>
                <p className="text-sm text-red-300/70 mt-1">{String(error || "Unknown Error")}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep("input")} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold h-11 rounded-xl">
                Try Again
              </Button>
              <Button onClick={handleClose} variant="outline" className="flex-1 border-[#1F2D40] text-slate-300 hover:bg-slate-800 rounded-xl h-11">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
