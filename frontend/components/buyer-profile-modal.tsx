"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BuyerProfileForm } from "./buyer-profile-form"

interface BuyerProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData?: any
}

export function BuyerProfileModal({ isOpen, onClose, onSave, initialData }: BuyerProfileModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 border-none bg-transparent shadow-none overflow-visible">
        <BuyerProfileForm 
          initialData={initialData} 
          onSave={onSave} 
        />
      </DialogContent>
    </Dialog>
  )
}
