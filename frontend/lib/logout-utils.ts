/**
 * Comprehensive logout utility that clears all browser data
 * This includes localStorage, sessionStorage, cookies, and Redux state
 */

export function clearAllBrowserData() {
  // Clear localStorage
  if (typeof window !== 'undefined') {
    // Supplier auth data
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('supplier_profile')
    localStorage.removeItem('supplier_profile') // legacy cleanup
    
    // Wallet data
    localStorage.removeItem('wallet_connected')
    localStorage.removeItem('wallet_type')
    localStorage.removeItem('wallet_publicKey')
    
    // Clear all other localStorage items (optional - uncomment if needed)
    // localStorage.clear()
  }
  
  // Clear sessionStorage
  if (typeof window !== 'undefined') {
    sessionStorage.clear()
  }
  
  // Clear all cookies
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i]
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      
      // Delete cookie for current path
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      
      // Delete cookie for root domain
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      
      // Delete cookie for parent domain (if applicable)
      const domain = window.location.hostname.split('.').slice(-2).join('.')
      document.cookie = `${name}=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
  }
}

export function clearSupplierData() {
  // Clear supplier-specific data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('supplier_profile')
    localStorage.removeItem('supplier_profile') // legacy cleanup
  }
  
  // Clear supplier cookies
  if (typeof document !== 'undefined') {
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "supplier_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "supplier_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT" // legacy cleanup
  }
}

/** @deprecated Use clearSupplierData instead */
export const clearSupplierData = clearSupplierData

export function clearWalletData() {
  // Clear wallet-specific data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wallet_connected')
    localStorage.removeItem('wallet_type')
    localStorage.removeItem('wallet_publicKey')
  }
}
