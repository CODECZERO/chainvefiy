import { 
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSignTransaction
} from "@stellar/freighter-api"

export const walletConnectors = {
  freighter: {
    name: "Freighter",
    icon: "🔐",
    isInstalled: async () => {
      if (typeof window === "undefined") return false
      try {
        const result = await freighterIsConnected()
        return !result.error && result.isConnected
      } catch {
        return false
      }
    },
    connect: async () => {
      try {
        // Check if Freighter is connected
        const connectedResult = await freighterIsConnected()
        if (connectedResult.error || !connectedResult.isConnected) {
          throw new Error("Freighter extension is not installed or not available")
        }
        
        // Request access - this will prompt user to allow the app
        const response = await freighterRequestAccess()
        if (response.error) {
          throw new Error(response.error || "User denied access to Freighter")
        }
        
        if (response.address) {
          return response.address
        }
        
        throw new Error("No address returned from Freighter")
      } catch (error) {
        throw error
      }
    },
    signTransaction: async (tx: string) => {
      try {
        const response = await freighterSignTransaction(tx, {
          networkPassphrase: "Test SDF Network ; September 2015",
        })
        if (response.error) {
          throw new Error(response.error || "Transaction signing failed")
        }
        
        if (response.signedTxXdr) {
          return response.signedTxXdr
        }
        
        throw new Error("No signed transaction returned")
      } catch (error) {
        throw error
      }
    },
  },

  albedo: {
    name: "Albedo",
    icon: "🎭",
    isInstalled: () => typeof window !== "undefined" && !!window.albedo,
    connect: async () => {
      if (!window.albedo) throw new Error("Albedo not installed")
      const result = await window.albedo.publicKey()
      return result.publicKey
    },
    signTransaction: async (tx: string) => {
      if (!window.albedo) throw new Error("Albedo not available")
      const result = await window.albedo.tx({
        xdr: tx,
        networkPassphrase: "Test SDF Network ; September 2015",
      })
      return result.signed_envelope_xdr
    },
  },

  "stellar-expert": {
    name: "Stellar Expert Signer",
    icon: "⭐",
    isInstalled: () => true, // Web-based, always available
    connect: async () => {
      // Stellar Expert uses a web-based signer
      return new Promise((resolve, reject) => {
        const publicKey = prompt("Enter your Stellar public key:")
        if (publicKey && publicKey.startsWith("G")) {
          resolve(publicKey)
        } else {
          reject(new Error("Invalid public key"))
        }
      })
    },
    signTransaction: async (tx: string) => {
      // For Stellar Expert, we'd typically redirect to their signer
      // For demo purposes, we'll show a message
      alert("Please sign the transaction on Stellar Expert Signer")
      return tx // In production, this would be the signed XDR
    },
  },

  lobstr: {
    name: "LOBSTR Vault",
    icon: "🏦",
    isInstalled: () => true, // Web-based, always available
    connect: async () => {
      return new Promise((resolve, reject) => {
        const publicKey = prompt("Enter your LOBSTR public key:")
        if (publicKey && publicKey.startsWith("G")) {
          resolve(publicKey)
        } else {
          reject(new Error("Invalid public key"))
        }
      })
    },
    signTransaction: async (tx: string) => {
      alert("Please sign the transaction in LOBSTR Vault")
      return tx
    },
  },

  ledger: {
    name: "Ledger",
    icon: "💳",
    isInstalled: () => true, // Can be installed
    connect: async () => {
      return new Promise((resolve, reject) => {
        const publicKey = prompt("Enter your Ledger Stellar public key:")
        if (publicKey && publicKey.startsWith("G")) {
          resolve(publicKey)
        } else {
          reject(new Error("Invalid public key"))
        }
      })
    },
    signTransaction: async (tx: string) => {
      alert("Please sign the transaction on your Ledger device")
      return tx
    },
  },
}

declare global {
  interface Window {
    stellar?: {
      requestAccess: (options: { domain: string }) => Promise<{
        publicKey?: string
        error?: { message: string }
      }>
      signTransaction: (
        tx: string,
        options: { networkPassphrase: string },
      ) => Promise<{
        signedXDR?: string
        error?: { message: string }
      }>
    }
    albedo?: {
      publicKey: () => Promise<{ publicKey: string }>
      tx: (options: {
        xdr: string
        networkPassphrase: string
      }) => Promise<{ signed_envelope_xdr: string }>
    }
  }
}
