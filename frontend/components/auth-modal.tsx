"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/lib/redux/store"
import { loginUser } from "@/lib/redux/slices/user-auth-slice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShieldCheck, MessageCircle } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: "login" | "signup"
}

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.userAuth)
  const [mode, setMode] = useState<"login" | "signup">(defaultMode)
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    whatsappNumber: "",
    role: "BUYER" as "BUYER" | "SUPPLIER",
  })

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "login") {
      const result = await dispatch(loginUser({ email: form.email, password: form.password }))
      if (loginUser.fulfilled.match(result)) onClose()
    } else {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/signup`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) { dispatch(loginUser({ email: form.email, password: form.password })); onClose() }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Sign in to Pramanik
          </DialogTitle>
          <DialogDescription>
            Suppliers sign in to manage listings. Buyers can browse freely and connect a wallet when paying.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.role === "BUYER" ? "default" : "outline"}
                  onClick={() => setForm((f) => ({ ...f, role: "BUYER" }))}
                >
                  Buyer
                </Button>
                <Button
                  type="button"
                  variant={form.role === "SUPPLIER" ? "default" : "outline"}
                  onClick={() => setForm((f) => ({ ...f, role: "SUPPLIER" }))}
                >
                  Supplier
                </Button>
              </div>
              <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {form.role === "SUPPLIER" && (
                <Input
                  placeholder="WhatsApp number (e.g. +919876543210)"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                />
              )}
            </>
          )}

          <Input type="email" placeholder="Email address" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Loading..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <div className="pt-2">
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" /> Sell via WhatsApp
              </Button>
            </a>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
