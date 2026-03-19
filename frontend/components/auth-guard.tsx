"use client"

import * as React from "react"
import { useSelector } from "react-redux"
import { usePathname, useRouter } from "next/navigation"
import type { RootState } from "@/lib/redux/store"

type UserRole = "SUPPLIER" | "BUYER" | "VERIFIER" | "ADMIN"

export function AuthGuard({
  children,
  requireRole,
  redirectTo = "/",
}: {
  children: React.ReactNode
  requireRole?: UserRole
  redirectTo?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user } = useSelector((s: RootState) => s.userAuth)

  const isAllowed =
    isAuthenticated &&
    (!requireRole || user?.role === requireRole) &&
    (requireRole !== "SUPPLIER" || Boolean(user?.supplierProfile?.id))

  React.useEffect(() => {
    if (isLoading) return
    if (!isAllowed) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`${redirectTo}${next}`)
    }
  }, [isAllowed, isLoading, pathname, redirectTo, router])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking your session…</div>
      </div>
    )
  }

  if (!isAllowed) return null

  return <>{children}</>
}
