"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Phone, User, Loader2, Save } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface BuyerProfile {
  fullName: string
  phoneNumber: string
  address: string
  city: string
  state: string
  pincode: string
  country: string
}

interface BuyerProfileFormProps {
  initialData?: BuyerProfile
  onSave?: (data: BuyerProfile) => void
  isLoading?: boolean
}

export function BuyerProfileForm({ initialData, onSave, isLoading: externalLoading }: BuyerProfileFormProps) {
  const [formData, setFormData] = useState<BuyerProfile>({
    fullName: initialData?.fullName || "",
    phoneNumber: initialData?.phoneNumber || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    pincode: initialData?.pincode || "",
    country: initialData?.country || "India",
  })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave(formData)
      }
      toast({
        title: "Success",
        description: "Your shipping profile has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isLoading = isSaving || externalLoading

  return (
    <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          Shipping Information
        </CardTitle>
        <CardDescription>
          Your details will be saved for a faster checkout next time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-10 rounded-xl bg-background/50 border-border/50 focus:border-orange-500/50 transition-all font-medium h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="+91 98765 43210"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="pl-10 rounded-xl bg-background/50 border-border/50 focus:border-orange-500/50 transition-all font-medium h-11"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="123, Marketplace St, Area 51"
              value={formData.address}
              onChange={handleChange}
              className="rounded-xl bg-background/50 border-border/50 focus:border-orange-500/50 transition-all font-medium h-11"
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="Mumbai"
                value={formData.city}
                onChange={handleChange}
                className="rounded-xl bg-background/50 border-border/50 focus:border-orange-500/50 transition-all font-medium h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium">State</Label>
              <Input
                id="state"
                name="state"
                placeholder="Maharashtra"
                value={formData.state}
                onChange={handleChange}
                className="rounded-xl bg-background/50 border-border/50 focus:border-orange-500/50 transition-all font-medium h-11"
                required
              />
            </div>
            <div className="space-y-2 cols-span-2 md:col-span-1">
              <Label htmlFor="pincode" className="text-sm font-medium">Pincode</Label>
              <Input
                id="pincode"
                name="pincode"
                placeholder="400001"
                value={formData.pincode}
                onChange={handleChange}
                className="rounded-xl bg-background/50 border-border/50 focus:border-orange-500/50 transition-all font-medium h-11"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95 gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Details
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
