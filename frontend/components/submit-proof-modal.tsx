"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Loader2, AlertCircle, Camera, Link as LinkIcon } from "lucide-react"
import { submitBountyProof } from "@/lib/api-service"
import { useSelector } from "react-redux"
import { RootState } from "@/lib/redux/store"

interface SubmitProofModalProps {
  isOpen: boolean
  onClose: () => void
  bounty: any
  onSuccess: () => void
}

export function SubmitProofModal({ isOpen, onClose, bounty, onSuccess }: SubmitProofModalProps) {
  const { user } = useSelector((s: RootState) => s.userAuth)
  
  const [step, setStep] = useState<"input" | "processing" | "success" | "error">("input")
  const [proofMediaUrl, setProofMediaUrl] = useState("")
  const [note, setNote] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!bounty?.id || !user?.id) {
      setError("Missing information (Bounty or Login)")
      setStep("error")
      return
    }

    if (!proofMediaUrl) {
      setError("Please provide a photo or video URL as proof")
      setStep("error")
      return
    }

    setIsProcessing(true)
    setStep("processing")
    setError("")

    try {
      const res = await submitBountyProof({
        bountyId: bounty.id,
        solverId: user.id,
        proofCid: proofMediaUrl // Mapping URL to CID for simplicity in dev
      })

      if (!res.success) {
        throw new Error(res.message || "Failed to submit proof")
      }

      setStep("success")
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed"
      setError(message)
      setStep("error")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (isProcessing) return
    setStep("input")
    setProofMediaUrl("")
    setNote("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-[#111827] border-[#1F2D40] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Camera className="text-blue-500 w-6 h-6" />
            {step === "input" && "Submit Proof"}
            {step === "processing" && "Submitting..."}
            {step === "success" && "Proof Submitted!"}
            {step === "error" && "Action Failed"}
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 pt-4">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-400 uppercase tracking-widest font-bold mb-1">Bounty Task</p>
              <p className="text-sm text-slate-300 italic">"{String(bounty?.description || "")}"</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-slate-400" />
                Proof Media URL (Photo/Video)
              </label>
              <Input
                placeholder="https://example.com/check-proof.jpg"
                value={proofMediaUrl}
                onChange={(e) => setProofMediaUrl(e.target.value)}
                className="bg-[#1C2333] border-[#1F2D40] text-white rounded-xl"
              />
              <p className="text-[10px] text-slate-500 mt-1">Upload to a host or paste an IPFS link</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Additional Note (Optional)</label>
              <Textarea
                placeholder="Provide any additional context for the issuer..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-[#1C2333] border-[#1F2D40] text-white rounded-xl placeholder:text-slate-500"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!proofMediaUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl mt-4"
            >
              Submit Proof to Issuer
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <div>
              <p className="text-lg font-bold">Anchoring Proof</p>
              <p className="text-slate-400 text-sm">Verifying your account and recording proof...</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Bounty Solved!</p>
              <p className="text-slate-400 text-sm">Your proof has been submitted. The issuer will reward you after manual verification or automatic time-out.</p>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-6 pt-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-400">Submission Error</p>
                <p className="text-sm text-red-300/70 mt-1">{String(error || "Unknown Error")}</p>
              </div>
            </div>

            <Button onClick={() => setStep("input")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
