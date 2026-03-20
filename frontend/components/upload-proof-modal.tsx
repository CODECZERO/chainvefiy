"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import { CheckCircle2, Loader2, Upload } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"
// Legacy Mongo/IPFS proof flow removed in Pramanik (verified marketplace).
import { submitProofTransaction } from "@/lib/stellar-utils"

interface UploadProofModalProps {
  isOpen: boolean
  onClose: () => void
  task: any
}

export function UploadProofModal({ isOpen, onClose, task }: UploadProofModalProps) {
  const [step, setStep] = useState<"form" | "uploading" | "success">("form")
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    file: null as File | null,
  })
  const [ipfsCid, setIpfsCid] = useState("")

  const { signTransaction, publicKey } = useWallet()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData({ ...formData, file: e.target.files[0] })
    }
  }

  const handleSubmit = async () => {
    if (!formData.file || !task) return;

    try {
      setStep("uploading")

      // NOTE: Wiring native IPFS Pinata HTTP Gateway connectivity.
      const ipfsData = new FormData()
      ipfsData.append('file', formData.file)
      const ipfsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ipfs/upload`, {
        method: 'POST',
        body: ipfsData
      }).then(res => res.json())

      if (!ipfsRes?.data?.cid) throw new Error("Failed to pin media to IPFS. Check Pinata credentials.")
      const cid = ipfsRes.data.cid
      setIpfsCid(cid)


      // 2. Submit Proof Transaction
      // Ensure we have the signer
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }


      const result = await submitProofTransaction(
        {
          supplierPublicKey: publicKey,
          taskId: task.id || task._id,
          proofCid: cid,
        },
        signTransaction
      )

      // 3. Save to backend (skipped in this build)

      setStep("success")
    } catch (error) {

      alert("Failed to submit proof: " + (error as Error).message);
      setStep("form"); // Go back to form on error
    }
  }

  const handleClose = () => {
    setStep("form")
    setFormData({ amount: "", description: "", file: null })
    // Do not clear cid immediately if we want to show success
    if (step !== "success") setIpfsCid("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white selection:bg-amber-500/30">
        <DialogHeader>
          <DialogTitle>
            {step === "form" && "Upload Proof"}
            {step === "uploading" && "Uploading to IPFS..."}
            {step === "success" && "Proof Uploaded Successfully"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            {task && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Product</p>
                <p className="font-semibold text-sm text-white">{task.title}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Amount Used (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Describe how funds were used"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Product Proof File</label>
              <div className="mt-2 border-2 border-dashed border-zinc-800 rounded-lg p-6 text-center cursor-pointer hover:bg-zinc-900/50 transition">
                <input type="file" onChange={handleFileChange} className="hidden" id="file-input" />
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">
                    {formData.file ? formData.file.name : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-zinc-500">PNG, JPG, PDF up to 10MB</p>
                </label>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!formData.amount || !formData.description || !formData.file}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11"
            >
              Upload Proof
            </Button>
          </div>
        )}

        {step === "uploading" && (
          <div className="space-y-4 text-center py-8">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <p className="text-muted-foreground">Uploading to IPFS...</p>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>

            <div>
              <p className="text-sm text-zinc-500 mb-1">Amount Verified</p>
              <p className="text-2xl font-bold text-white">₹{formData.amount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left">
              <p className="text-xs text-zinc-500 mb-1">IPFS CID</p>
              <p className="font-mono text-xs text-zinc-300 break-all">{ipfsCid}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              Your proof has been uploaded and will be verified by the blockchain
            </p>

            <Button onClick={handleClose} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
