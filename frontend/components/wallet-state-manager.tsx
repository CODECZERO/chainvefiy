"use client"

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/lib/redux/store'
import { fetchCurrentUser } from '@/lib/redux/slices/user-auth-slice'
import { restoreWalletKit, restoreWalletState } from '@/lib/redux/slices/wallet-slice'

export function WalletStateManager() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    // Try to restore session on page load
    dispatch(fetchCurrentUser()).catch(() => {})
    dispatch(restoreWalletState())
    dispatch(restoreWalletKit()).catch(() => {})
  }, [dispatch])

  return null
}
