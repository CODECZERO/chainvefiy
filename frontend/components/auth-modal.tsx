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
    role: "SUPPLIER" as "SUPPLIER",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setMode(defaultMode)
    setLocalError(null)
  }, [defaultMode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (mode === "login") {
      const result = await dispatch(loginUser({ email: form.email, password: form.password }))
      if (loginUser.fulfilled.match(result)) onClose()
    } else {
      setIsSubmitting(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/signup`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (res.ok) { 
          dispatch(loginUser({ email: form.email, password: form.password })); 
          onClose() 
        } else {
          const data = await res.json().catch(() => null);
          const errMsg = data?.message || "Registration failed. Please try again.";
          setLocalError(errMsg);
          
          // If already registered, help the user switch to login
          if (errMsg.includes("already registered")) {
            setTimeout(() => {
              // We could automatically switch to login mode here or just show the error
              // For now, let's just make sure the error is clear
            }, 1000);
          }
        }
      } catch (err) {
        setLocalError("Network error. Please check your connection.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            Supplier Portal
          </DialogTitle>
          <DialogDescription className="pt-1">
            Access your supplier dashboard, manage products, and verify bulk shipments. 
            <span className="block mt-1 font-medium text-foreground">Buyers: Connect your wallet on the main page to verify products.</span>
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
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Register as Supplier</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">Join our network of verified manufacturers and distributors.</div>
                </div>
              </div>
              <Input placeholder="Full name or Company name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input
                placeholder="WhatsApp number (e.g. +919876543210)"
                value={form.whatsappNumber}
                onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              />
            </>
          )}

          <Input type="email" placeholder="Email address" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />

          {(localError || error) && (
            <div className="text-center space-y-2">
              <p className="text-destructive text-sm font-medium">{localError || error}</p>
              {(localError || error)?.includes("already registered") && mode === "signup" && (
                <button 
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-xs text-primary hover:underline font-bold"
                >
                  Already have an account? Sign in here
                </button>
              )}
            </div>
          )}

          <Button type="submit" disabled={isLoading || isSubmitting} className="w-full">
            {isLoading || isSubmitting ? "Loading..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <div className="pt-2 border-t border-border mt-4">
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=NEW`} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-primary">
                <MessageCircle className="w-3.5 h-3.5 mr-2" /> Can't access? Request help via WhatsApp
              </Button>
            </a>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
