"use client"

import { useEffect, useState } from "react"

/**
 * Hook to check if component is mounted (client-side)
 * Useful for avoiding SSR hydration mismatches
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
