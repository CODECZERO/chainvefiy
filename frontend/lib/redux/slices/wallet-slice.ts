import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import type { WalletType } from "@/lib/wallet-types"
import { kit } from "@/lib/stellar-kit"

interface WalletState {
  isConnected: boolean
  publicKey: string | null
  balance: number
  isConnecting: boolean
  error: string | null
  walletType: WalletType | null
}

const initialState: WalletState = {
  isConnected: false,
  publicKey: null,
  balance: 0,
  isConnecting: false,
  error: null,
  walletType: null,
}

export const connectWallet = createAsyncThunk<
  { publicKey: string; balance: number; walletType: WalletType },
  WalletType,
  { rejectValue: string }
>("wallet/connect", async (walletType: WalletType, { rejectWithValue }) => {
  try {

    // Set the selected wallet in the kit
    kit.setWallet(walletType);

    // Request public key (address in this kit version)
    const { address: publicKey } = await kit.getAddress();

    if (!publicKey) {
      throw new Error("Failed to get public key from wallet");
    }

    // Store wallet connection in localStorage for cross-tab sync
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_connected', 'true')
      localStorage.setItem('wallet_type', walletType)
      localStorage.setItem('wallet_publicKey', publicKey)
    }

    // Fetch balance
    let balance = 0
    try {
      const { getAccountBalance } = await import("@/lib/stellar-utils")
      balance = await getAccountBalance(publicKey)
    } catch (error) {
    }

    return { publicKey, balance, walletType }
  } catch (error: any) {

    let message = "Failed to connect wallet";

    // Error handling as per Level 2 requirements
    if (error.message?.includes("not installed") || error.message?.includes("not found")) {
      message = "Wallet not found. Please ensure the extension is installed.";
    } else if (error.message?.includes("rejected") || error.message?.includes("denied") || error.message?.includes("declined")) {
      message = "Connection rejected by user.";
    } else if (error.message?.includes("balance")) {
      message = "Insufficient balance for this operation.";
    } else {
      message = error.message || message;
    }

    return rejectWithValue(message)
  }
})

export const restoreWalletKit = createAsyncThunk<void, void>(
  "wallet/restoreKit",
  async () => {
    if (typeof window === "undefined") return
    const isConnected = localStorage.getItem("wallet_connected") === "true"
    const walletType = localStorage.getItem("wallet_type")
    if (!isConnected || !walletType) return
    kit.setWallet(walletType as any)
  }
)

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    restoreWalletState: (state) => {
      // Restore wallet state from localStorage on app load
      if (typeof window !== 'undefined') {
        try {
          const isConnected = localStorage.getItem('wallet_connected') === 'true'
          const walletType = localStorage.getItem('wallet_type')
          const publicKey = localStorage.getItem('wallet_publicKey')

          if (isConnected && walletType && publicKey) {
            state.isConnected = true
            state.walletType = walletType as any
            state.publicKey = publicKey
            state.error = null
          }
        } catch (error) {
          // Clear potentially corrupted state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('wallet_connected')
            localStorage.removeItem('wallet_type')
            localStorage.removeItem('wallet_publicKey')
          }
        }
      }
    },
    disconnectWallet: (state) => {
      // Clear all wallet-related data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wallet_connected')
        localStorage.removeItem('wallet_type')
        localStorage.removeItem('wallet_publicKey')
        localStorage.removeItem('wallet_balance')

        // Clear session storage as well
        sessionStorage.removeItem('wallet_state')

        // Clear cookies that might store wallet info
        document.cookie = 'wallet_connected=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'wallet_address=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }

      // Reset state
      state.isConnected = false
      state.publicKey = null
      state.balance = 0
      state.walletType = null
      state.error = null
    },
    clearWalletError: (state) => {
      state.error = null
    },
    setBalance: (state, action) => {
      state.balance = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectWallet.pending, (state) => {
        state.isConnecting = true
        state.error = null
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.isConnecting = false
        state.isConnected = true
        state.publicKey = action.payload.publicKey
        state.balance = action.payload.balance
        state.walletType = action.payload.walletType
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.isConnecting = false
        state.error = action.payload as string
      })
  },
})

export const signTransaction = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "wallet/signTransaction",
  async (transactionXDR: string, { getState, rejectWithValue }) => {
    try {
      console.log("[WALLET] signTransaction called with XDR length:", transactionXDR.length);
      const state = getState() as any;
      const walletType = state.wallet.walletType;
      const publicKey = state.wallet.publicKey;

      // Ensure kit has a wallet set (essential after page refresh)
      if (walletType) {
        console.log("[WALLET] Ensuring kit wallet is set to:", walletType);
        kit.setWallet(walletType);
      } else {
        throw new Error("No wallet connected. Please connect your wallet first.");
      }

      const network = kit.getNetwork().then(res => res.networkPassphrase).catch(() => "Test SDF Network ; September 2015");
      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        networkPassphrase: await network,
        address: publicKey || undefined // Help wallet identify the signer
      });
      console.log("[WALLET] kit.signTransaction successful");
      return signedTxXdr;
    } catch (error: any) {
      console.error("[WALLET] signTransaction error:", error);
      let message = "Failed to sign transaction";

      if (error.message?.includes("rejected") || error.message?.includes("denied") || error.message?.includes("declined")) {
        message = "Transaction rejected by user.";
      }

      return rejectWithValue(message)
    }
  }
)

export const { restoreWalletState, disconnectWallet, clearWalletError, setBalance, setError } = walletSlice.actions
export default walletSlice.reducer
