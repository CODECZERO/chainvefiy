"use client"

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/lib/redux/store'
import { fetchCurrentUser } from '@/lib/redux/slices/user-auth-slice'
import { restoreWalletKit, restoreWalletState } from '@/lib/redux/slices/wallet-slice'

export function WalletStateManager() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    // Initial restoration
    dispatch(fetchCurrentUser()).catch(() => {})
    dispatch(restoreWalletState())
    dispatch(restoreWalletKit()).catch(() => {})

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return

      // Sync Wallet Status
      if (e.key === 'wallet_connected' || e.key === 'wallet_publicKey') {
        dispatch(restoreWalletState())
        dispatch(restoreWalletKit()).catch(() => {})
      }

      // Sync Authentication Status
      if (e.key === 'auth_sync') {
        dispatch(fetchCurrentUser()).catch(() => {})
      }

      // Sync Logout
      if (e.key === 'auth_logout') {
        // We could dispatch a local logout but fetchCurrentUser 
        // will naturally fail and clear the state if we call it.
        dispatch(fetchCurrentUser()).catch(() => {})
        dispatch(restoreWalletState()) 
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [dispatch])

  return null
}
