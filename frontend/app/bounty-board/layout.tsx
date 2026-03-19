import type React from "react"
import { AuthGuard } from "@/components/auth-guard"

export default function BountyBoardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard redirectTo="/">{children}</AuthGuard>
}

