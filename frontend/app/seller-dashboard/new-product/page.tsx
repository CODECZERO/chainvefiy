"use client"

import React, { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import { convertInrToUsdc } from "@/lib/exchange-rates"
import { getUSDCInrRate } from "@/lib/exchange-rates"
import {
  ChevronLeft, MessageCircle, Info, Image as ImageIcon,
  UploadCloud, X, Check, QrCode, Share2, Plus, ArrowRight,
  Wheat, Palette, Shirt, Apple, Brush, Package, Loader2
} from "lucide-react"
import { ipfsImageUrl } from "@/lib/ipfs"

const CATEGORIES = [
  { id: 1, label: "Agriculture", icon: <Wheat className="w-5 h-5" /> },
  { id: 2, label: "Handicrafts", icon: <Palette className="w-5 h-5" /> },
  { id: 3, label: "Textiles", icon: <Shirt className="w-5 h-5" /> },
  { id: 4, label: "Food", icon: <Apple className="w-5 h-5" /> },
  { id: 5, label: "Art", icon: <Brush className="w-5 h-5" /> },
  { id: 6, label: "Other", icon: <Package className="w-5 h-5" /> },
]

export default function NewProductWizard() {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [category, setCategory] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [usdcInr, setUsdcInr] = useState(83.33)
  const { user } = useSelector((s: RootState) => s.userAuth)
  const sid = user?.supplierProfile?.id
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  useEffect(() => {
    getUSDCInrRate().then(setUsdcInr).catch(() => {})
  }, [])

  const uploadToIpfs = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch(`${api}/ipfs/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const data = await res.json()
      if (data.data?.cid) {
        return data.data.cid
      }
      throw new Error("Upload failed")
    } catch (e) {
      console.error("IPFS upload error:", e)
      return null
    }
  }

  const handleImageDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      // Show local preview immediately (optional, but better UX would be to show loading)
      setLoading(true)
      const cid = await uploadToIpfs(file)
      if (cid) {
        setImages(prev => [...prev, cid])
      }
      setLoading(false)
    }
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const submitProduct = async () => {
    if (!sid) return
    setLoading(true)
    try {
      const cat = CATEGORIES.find((c) => c.id === category)?.label || "Other"
      const res = await fetch(`${api}/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: sid,
          title,
          description: desc,
          priceInr: Number(price),
          category: cat,
          quantity: quantity || null,
          proofMediaUrls: images.length > 0 ? images : [],
        })
      })
      if (res.ok) {
        const json = await res.json()
        const p = json?.data
        setProduct(p)
        setStep(3)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <Header />

      {/* WhatsApp Banner */}
      <div className="bg-gradient-to-r from-[#0D2010] to-[#111827] border-b border-[#25D366]/20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            <span className="text-sm font-medium">In a hurry? List via WhatsApp</span>
          </div>
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 h-8 text-xs px-3 rounded-lg">
              Open WhatsApp
            </Button>
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Navigation & Progress */}
        {step < 3 && (
          <div className="mb-8">
            <Link href="/seller-dashboard" className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-sm mb-6 inline-flex transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold">List a new product</h1>
              <div className="text-sm font-medium text-orange-400">Step {step} of 2</div>
            </div>
            
            <div className="h-1.5 bg-[#1C2333] rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-500 ease-out" style={{ width: `${(step / 2) * 100}%` }} />
            </div>
          </div>
        )}

        {/* ── STEP 1: Product Details ── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#111827] border border-[#1F2D40] rounded-2xl p-6">
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Product Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Organic Honey 500g"
                    className="w-full bg-[#0D1321] border border-[#1F2D40] rounded-xl px-4 py-3 text-white placeholder:text-[#6B7280] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Category</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => setCategory(c.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                          category === c.id
                            ? "bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(232,119,46,0.1)]"
                            : "bg-[#0D1321] border-[#1F2D40] text-[#9CA3AF] hover:border-orange-500/30 hover:text-white"
                        }`}>
                        <span className="text-2xl mb-2 grayscale hover:grayscale-0">{c.icon}</span>
                        <span className="font-medium text-sm">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Price (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-[#6B7280] font-medium">₹</span>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                      className="w-full bg-[#0D1321] border border-[#1F2D40] rounded-xl pl-8 pr-4 py-3 text-white placeholder:text-[#6B7280] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all font-mono" />
                  </div>
                  {price && Number(price) > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-sm">
                      <span className="text-[#6B7280]">Buyers pay ≈</span>
                      <span className="font-mono text-[#2775CA] font-bold">{convertInrToUsdc(Number(price), usdcInr).toFixed(4)} USDC</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Quantity</label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g., 1 kg, 500g, 10 units"
                    className="w-full bg-[#0D1321] border border-[#1F2D40] rounded-xl px-4 py-3 text-white placeholder:text-[#6B7280] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F9FAFB] mb-2">Description</label>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Describe the product, materials, and origin..."
                    className="w-full bg-[#0D1321] border border-[#1F2D40] rounded-xl px-4 py-3 text-white placeholder:text-[#6B7280] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all resize-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!title || !price || !category || !quantity} className="bg-[#E8772E] hover:bg-[#d96a24] h-12 px-8 rounded-xl text-md font-semibold font-sans">
                Next Step <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Proof Media ── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-[#111827] border border-[#1F2D40] rounded-2xl p-6">
              
              <div className="mb-6 flex items-start gap-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-orange-300">Why upload proof?</div>
                  <div className="text-orange-200/70 mt-1">
                    Products with original photos and videos get verified 3x faster by the community. Stock images will be flagged and rejected.
                  </div>
                </div>
              </div>

              {/* Upload Zone */}
              <label className="cursor-pointer block">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageDrop} />
                <div className="border-2 border-dashed border-[#1F2D40] hover:border-orange-500/50 hover:bg-[#0D1321] rounded-2xl p-10 transition-all text-center group">
                  <div className="w-16 h-16 bg-[#1C2333] group-hover:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                    <UploadCloud className="w-8 h-8 text-[#6B7280] group-hover:text-orange-400" />
                  </div>
                  <div className="font-semibold text-lg text-[#F9FAFB] mb-1">Click to upload photos</div>
                  <div className="text-[#6B7280] text-sm">JPG, PNG up to 10MB</div>
                </div>
              </label>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#1F2D40]">
                  <div className="text-sm font-medium mb-3">Attached Media ({images.length}/5)</div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-[#1F2D40] group">
                        <img src={ipfsImageUrl(img)} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => removeImage(idx)} className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 hover:scale-110 transition-transform">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <label className="w-24 h-24 shrink-0 rounded-xl border border-[#1F2D40] border-dashed flex items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-[#0D1321] transition-all">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageDrop} />
                        <Plus className="w-6 h-6 text-[#6B7280]" />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setStep(1)} className="text-[#9CA3AF] hover:text-white font-medium text-sm transition-colors">
                Back to Details
              </button>
              <Button onClick={submitProduct} disabled={loading || images.length === 0} className="bg-[#E8772E] hover:bg-[#d96a24] h-12 px-8 rounded-xl text-md font-semibold font-sans relative overflow-hidden">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    List Product
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 3 && product && (
          <div className="animate-in zoom-in-95 duration-700 max-w-lg mx-auto text-center mt-10">
            
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <Check className="w-10 h-10" />
            </div>
            
            <h1 className="text-3xl font-bold mb-3">Listing created!</h1>
            <p className="text-[#9CA3AF] mb-8">
              Your product "{String(title || "")}" has been submitted to the community queue. Verification usually takes 10-15 minutes.
            </p>

            <div className="bg-[#111827] border border-[#1F2D40] rounded-3xl p-8 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              
              <div className="font-semibold text-[#6B7280] uppercase tracking-widest text-xs mb-5">Print & Share QR Code</div>
              
              <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 mb-5 shadow-xl">
                <img src={product.qrCodeUrl} alt="Product QR Code" className="w-full h-full" />
              </div>
              
              <div className="flex flex-col gap-3">
                <a href={product.qrCodeUrl} download={`pramanik-${product.id}.png`}>
                  <Button className="w-full bg-[#1C2333] border border-[#1F2D40] hover:bg-[#263449] h-11 rounded-xl">
                    Download QR Image
                  </Button>
                </a>
                <a href={`https://wa.me/?text=Check out my verified product on Pramanik! https://pramanik.com/product/${product.id}`} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 h-11 rounded-xl font-semibold">
                    <Share2 className="w-4 h-4 mr-2" /> Share on WhatsApp
                  </Button>
                </a>
              </div>
            </div>

            <Link href="/seller-dashboard">
              <Button className="bg-transparent text-[#9CA3AF] hover:text-white border border-transparent hover:border-[#1F2D40] h-12 px-8 rounded-xl font-medium transition-all">
                Return to Dashboard
              </Button>
            </Link>

          </div>
        )}
      </div>
    </div>
  )
}
