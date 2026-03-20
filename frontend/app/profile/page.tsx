"use client"

import Link from "next/link"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function SelfProfilePage() {
  const { user } = useSelector((s: RootState) => s.userAuth)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My profile</h1>
            <p className="text-muted-foreground mt-1">Your account details, role, and wallet status.</p>
          </div>
          {user?.role === "SUPPLIER" && (
            <Button asChild>
              <Link href="/seller-dashboard">Open seller dashboard</Link>
            </Button>
          )}
          {user?.role === "BUYER" && (
            <Button asChild>
              <Link href="/buyer-dashboard">Open buyer dashboard</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium truncate">{user?.email}</div>
              </div>
              {user?.role && <Badge variant="secondary">{user.role}</Badge>}
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Stellar wallet</div>
            <div className="font-mono text-sm break-all mt-2">{user?.stellarWallet || "Not connected"}</div>
          </Card>

          {user?.supplierProfile?.id && (
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Supplier profile</div>
                  <div className="font-medium truncate mt-1">{user.supplierProfile.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">Trust score: {user.supplierProfile.trustScore}/100</div>
                </div>
                <Badge variant={user.supplierProfile.isVerified ? "default" : "outline"}>
                  {user.supplierProfile.isVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

