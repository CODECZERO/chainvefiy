"use client"

import type React from "react"
import { createContext, useContext, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState, AppDispatch } from "@/lib/redux/store"
import { logoutUser, fetchCurrentUser } from "@/lib/redux/slices/user-auth-slice"

interface UserAuthContextType {
  isAuthenticated: boolean
  supplierProfile: any | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (supplierData: any) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined)

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, user, isLoading, error } = useSelector((state: RootState) => state.userAuth)

  useEffect(() => {
    // Check for existing supplier session on mount
    dispatch(fetchCurrentUser())
  }, [dispatch])

  const login = async (email: string, password: string) => {
    // Prefer using AuthModal / redux thunks directly; context kept for backward compat.
    throw new Error("Use AuthModal to sign in.")
  }

  const signup = async (supplierData: any) => {
    throw new Error("Use AuthModal to sign up.")
  }

  const logout = () => {
    dispatch(logoutUser())
  }

  const checkAuth = () => {
    dispatch(fetchCurrentUser())
  }

  return (
    <UserAuthContext.Provider
      value={{
        isAuthenticated,
        supplierProfile: (user as any)?.supplierProfile || null,
        isLoading,
        error,
        login,
        signup,
        logout,
        checkAuth,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  )
}

export function useUserAuth() {
  const context = useContext(UserAuthContext)
  if (!context) {
    throw new Error("useUserAuth must be used within UserAuthProvider")
  }
  return context
}
