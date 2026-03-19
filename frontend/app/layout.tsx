import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ReduxProvider } from "@/lib/redux-provider"
import { WalletStateManager } from "@/components/wallet-state-manager"
import { Toaster } from "@/components/ui/toaster"
import { WalletProvider } from "@/lib/wallet-context"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pramanik — Verified Marketplace on Stellar",
  description: "Every product verified by the community. Pay with any currency, settled in USDC. Suppliers list via WhatsApp.",
  generator: "pramanik.app",
  openGraph: {
    title: "Pramanik — Verified Marketplace on Stellar",
    description: "Community-verified products. Blockchain-backed proof. Pay with XLM, USDC, or UPI.",
    type: "website",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ReduxProvider>
            <WalletProvider>
              <WalletStateManager />
              {children}
              <Toaster />
              <Analytics />
            </WalletProvider>
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
