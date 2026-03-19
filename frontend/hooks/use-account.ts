import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/redux/store"

/**
 * Hook to get current wallet account information from Freighter
 * Returns account data with proper typing
 */
export function useAccount() {
  const [account, setAccount] = useState<{ address: string; displayName: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const freighterApi = await import("@stellar/freighter-api") as any
        if (await freighterApi.isConnected()) {
          const userInfo = await freighterApi.getUserInfo?.()
          if (userInfo?.publicKey) {
            setAccount({
              address: userInfo.publicKey,
              displayName: `${userInfo.publicKey.slice(0, 4)}...${userInfo.publicKey.slice(-4)}`,
            })
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccount()
  }, [])

  // Fallback to Redux state if Freighter doesn't have account
  const { isConnected: reduxConnected, publicKey, balance, walletType } = useSelector(
    (state: RootState) => state.wallet,
  )

  if (account) {
    return {
      address: account.address,
      displayName: account.displayName,
      publicKey: account.address,
      balance: balance || 0,
      walletType: 'freighter',
      shortAddress: `${account.address.slice(0, 8)}...${account.address.slice(-6)}`,
      fullAddress: account.address,
    }
  }

  if (reduxConnected && publicKey) {
    return {
      publicKey,
      balance,
      walletType,
      displayName: `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`,
      shortAddress: `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}`,
      fullAddress: publicKey,
      address: publicKey,
    }
  }

  return null
}


