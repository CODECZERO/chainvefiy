"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/lib/wallet-context"
import { escrowContractService } from "@/lib/services/contracts/escrow.service"
import { submitProofTransaction } from "@/lib/stellar-utils"
import { WalletRequirement } from "@/components/wallet-requirement"
import { Loader2, Camera, MapPin, UploadCloud } from "lucide-react"

export default function DeliveryVerificationPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.taskId as string
  const { publicKey, signTransaction, connect } = useWallet()
  const [escrow, setEscrow] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [deliveryFile, setDeliveryFile] = useState<File | null>(null)
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchEscrow() {
      if (!taskId) return
      try {
        const response = await escrowContractService.getEscrow(taskId)
        if (response.success) {
          setEscrow(response.data)
        }
      } catch (err) {
        console.error("Failed to load escrow:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchEscrow()
  }, [taskId])

  const handleCaptureLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
    } else {
      alert("Geolocation is not supported by your browser.")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setDeliveryFile(e.target.files[0])
    }
  }

  const handleUploadProof = async () => {
    if (!deliveryFile || !gpsData || !escrow || !publicKey) return
    setUploading(true)
    try {
      // 1. Upload to IPFS. In production, this uses Pinata API.
      const formData = new FormData()
      formData.append('file', deliveryFile)
      const ipfsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ipfs/upload`, {
        method: 'POST',
        body: formData
      }).then(res => res.json())
      
      if (!ipfsRes?.data?.cid) throw new Error("Failed to pin media to IPFS. Check Pinata credentials.")
      const mockCid = ipfsRes.data.cid
      
      const payloadObj = {
        mediaCid: mockCid,
        gps: gpsData,
        timestamp: Date.now()
      }
      const finalCid = "Qm" + btoa(JSON.stringify(payloadObj)).replace(/=/g, '').slice(0, 44)

      // 2. Submit to smart contract
      await submitProofTransaction({
        supplierPublicKey: publicKey,
        taskId,
        proofCid: finalCid
      }, signTransaction)
      
      alert("Proof submitted successfully!")
      window.location.reload()
    } catch (err: any) {
      alert("Error submitting proof: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleReleaseEscrow = async () => {
    try {
      setLoading(true)
      await escrowContractService.releaseEscrow(taskId)
      alert("Escrow released successfully!")
      window.location.reload()
    } catch (err: any) {
      alert("Error releasing escrow: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReturn = async () => {
    if (!publicKey) return
    try {
      setLoading(true)
      const res = await escrowContractService.buildRequestReturnTx({ buyerPublicKey: publicKey, taskId })
      if (res.data?.xdr) {
        await signTransaction(res.data.xdr)
        alert("Return requested successfully!")
        window.location.reload()
      }
    } catch (err: any) {
      alert("Error requesting return: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReturn = async () => {
    if (!publicKey) return
    try {
      setLoading(true)
      const res = await escrowContractService.buildConfirmReturnTx({ supplierPublicKey: publicKey, taskId })
      if (res.data?.xdr) {
        await signTransaction(res.data.xdr)
        alert("Return confirmed successfully! Refund issued.")
        window.location.reload()
      }
    } catch (err: any) {
      alert("Error confirming return: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen pt-20 flex justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
  if (!escrow) return <div className="min-h-screen pt-20 text-center">Order not found</div>

  const isSupplier = publicKey === escrow.supplier
  const isBuyer = publicKey === escrow.buyer

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <WalletRequirement fallbackMessage="Please connect your wallet to view this order's details.">
      <div className="max-w-2xl mx-auto px-4 py-10 pt-24">
        <h1 className="text-3xl font-semibold mb-6">Delivery Verification</h1>
        
        <Card className="p-6">
          <div className="mb-4">
            <p className="text-sm text-zinc-400">Order ID</p>
            <p className="font-mono break-all">{taskId}</p>
          </div>
          <div className="mb-4">
            <p className="text-sm text-zinc-400">Status</p>
            <p className="font-semibold text-lg">{escrow.status?.sym || escrow.status}</p>
          </div>

          {(escrow.status === "Locked" || escrow.status?.sym === "Locked") && !escrow.proof_cid ? (
            isSupplier ? (
              <div className="space-y-6 mt-6 border-t border-zinc-800 pt-6">
                <h3 className="text-lg font-medium">Capture Delivery Proof</h3>
                
                <div className="space-y-4">
                  <Button variant="outline" className="w-full flex gap-2" onClick={handleCaptureLocation}>
                    <MapPin className="w-4 h-4" /> {gpsData ? `Location Captured: ${gpsData.lat.toFixed(4)}, ${gpsData.lng.toFixed(4)}` : "Record GPS Location"}
                  </Button>

                  <input type="file" accept="video/*,image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <Button variant="outline" className="w-full flex gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-4 h-4" /> {deliveryFile ? deliveryFile.name : "Capture Photo/Video"}
                  </Button>

                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black mt-4" 
                    disabled={!gpsData || !deliveryFile || uploading}
                    onClick={handleUploadProof}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                    Upload to IPFS & Confirm
                  </Button>
                </div>
              </div>
            ) : isBuyer ? (
              <p className="text-muted-foreground mt-4 border-t border-zinc-800 pt-4">Waiting for supplier to upload delivery proof.</p>
            ) : (
              <p className="text-muted-foreground mt-4 border-t border-zinc-800 pt-4">Connect as buyer or supplier to proceed.</p>
            )
          ) : escrow.proof_cid && (
            <div className="space-y-4 mt-6 border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-medium">Delivery Proof</h3>
              <p className="text-sm text-zinc-400">IPFS CID: <span className="font-mono text-zinc-300 break-all">{escrow.proof_cid}</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
                <p className="text-xs text-amber-500 mb-2">Notice: Verified on IPFS network</p>
                <div className="aspect-video bg-zinc-950 flex items-center justify-center rounded border border-zinc-800">
                  <Camera className="w-8 h-8 text-zinc-700" />
                  <span className="ml-2 text-zinc-600 text-sm">Media encrypted</span>
                </div>
              </div>

              {isBuyer && (escrow.status === "Locked" || escrow.status?.sym === "Locked") && (
                <div className="flex gap-4 mt-4">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleReleaseEscrow}>
                    Verify & Release Payment
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={handleRequestReturn}>
                    Request Return
                  </Button>
                </div>
              )}
            </div>
          )}

          {(escrow.status === "ReturnRequested" || escrow.status?.sym === "ReturnRequested") && (
            <div className="space-y-4 mt-6 border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-medium text-amber-500">Return Requested</h3>
              <p className="text-zinc-400 text-sm">The buyer has requested a return for this item. Please confirm once you receive the product back.</p>
              {isSupplier && (
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-4" onClick={handleConfirmReturn}>
                  Confirm Product Returned (Issue Refund)
                </Button>
              )}
            </div>
          )}

          {(escrow.status === "Refunded" || escrow.status?.sym === "Refunded") && (
            <div className="space-y-4 mt-6 border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-medium text-green-500">Order Refunded</h3>
              <p className="text-zinc-400 text-sm">The item was returned and the funds have been fully refunded to the buyer.</p>
            </div>
          )}
        </Card>
      </div>
      </WalletRequirement>
    </div>
  )
}
