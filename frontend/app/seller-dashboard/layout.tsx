import type React from "react"
import { AuthGuard } from "@/components/auth-guard"

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireRole="SUPPLIER" redirectTo="/">
      {children}
    </AuthGuard>
  )
}

