"use client"

import type React from "react"
import { createContext, useContext, useCallback } from "react"
import type { WalletType } from "./wallet-types"
import { useSelector, useDispatch } from "react-redux"
import type { RootState, AppDispatch } from "./redux/store"
import { connectWallet, disconnectWallet, signTransaction as signTx } from "./redux/slices/wallet-slice"

interface WalletContextType {
  isConnected: boolean
  publicKey: string | null
  balance: number
  isConnecting: boolean
  error: string | null
  walletType: WalletType | null
  connect: (walletType: WalletType) => Promise<void>
  disconnect: () => void
  signTransaction: (tx: string) => Promise<string>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()

  // Read all wallet state from Redux (single source of truth)
  const { isConnected, publicKey, balance, isConnecting, error, walletType } = useSelector(
    (state: RootState) => state.wallet
  )

  const connect = useCallback(async (selectedWalletType: WalletType) => {
    await dispatch(connectWallet(selectedWalletType)).unwrap()
  }, [dispatch])

  const disconnect = useCallback(() => {
    dispatch(disconnectWallet())
  }, [dispatch])

  const signTransaction = useCallback(
    async (tx: string) => {
      const result = await dispatch(signTx(tx)).unwrap()
      return result
    },
    [dispatch],
  )

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        publicKey,
        balance: balance || 0,
        isConnecting,
        error,
        walletType: walletType as WalletType | null,
        connect,
        disconnect,
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider")
  }
  return context
}

