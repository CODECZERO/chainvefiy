/**
 * Utility functions for wallet management
 */

declare global {
  interface Window {
    freighter?: {
      disconnect: () => Promise<void>;
    };
    clearStellarWallet?: () => void;
  }
}

export const clearWalletData = () => {
  if (typeof window === 'undefined') return;

  // Clear localStorage
  const storageKeys = [
    'wallet_connected',
    'wallet_type',
    'wallet_publicKey',
    'wallet_balance',
    'wallet_network',
    'wallet_address',
    'freighter:connected',
    'freighter:selectedWallet',
    'freighter:version'
  ];

  storageKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      
    }
  });

  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (error) {
    
  }

  // Clear cookies
  const cookieOptions = 'path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  const cookiesToClear = [
    'wallet_connected',
    'wallet_type',
    'wallet_address',
    'wallet_network',
    'freighter:auth',
    'freighter:connected',
    'freighter:selectedWallet'
  ];

  cookiesToClear.forEach(cookie => {
    try {
      document.cookie = `${cookie}=; ${cookieOptions}`;
    } catch (error) {
      
    }
  });

  // Clear Freighter specific data
  if (window.freighter) {
    try {
      window.freighter.disconnect().catch(() => {});
    } catch (error) {
      
    }
  }

  // Clear any event listeners
  try {
    window.removeEventListener('freighter:disconnect', clearWalletData);
  } catch (error) {
    
  }

  // Clear any indexedDB data
  if (window.indexedDB) {
    try {
      const dbs = ['freighter', 'wallet-connector'];
      dbs.forEach(dbName => {
        (req => { if (typeof (req as any).catch === 'function') (req as any).catch(() => {}); })(window.indexedDB.deleteDatabase(dbName));
      });
    } catch (error) {
      
    }
  }
};

// Add a global function to clear all wallet data
if (typeof window !== 'undefined') {
  window.clearStellarWallet = clearWalletData;
}
