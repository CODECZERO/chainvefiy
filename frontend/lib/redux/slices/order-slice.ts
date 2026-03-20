import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { verifyDonation, getOrders } from "@/lib/api-service"

interface DonationState {
  isDonating: boolean
  donationHistory: any[]
  currentDonation: {
    amount: number
    currency: 'XLM' | 'INR'
    taskId: string | null
    transactionHash: string | null
  } | null
  error: string | null
  exchangeRate: number
}

const initialState: DonationState = {
  isDonating: false,
  donationHistory: [],
  currentDonation: null,
  error: null,
  exchangeRate: 15, // Default fallback rate
}

export const fetchExchangeRate = createAsyncThunk(
  "donation/fetchExchangeRate",
  async (_, { rejectWithValue }) => {
    try {
      const { getExchangeRate } = await import("@/lib/exchange-rates")
      const rate = await getExchangeRate()
      return rate
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch exchange rate"
      return rejectWithValue(message)
    }
  }
)

export const processDonation = createAsyncThunk(
  "donation/processDonation",
  async (
    {
      amount,
      currency,
      taskId,
      publicKey,
      receiverPublicKey,
      signTransaction,
    }: {
      amount: number
      currency: 'XLM' | 'INR'
      taskId: string
      publicKey: string
      receiverPublicKey: string  // Supplier's wallet address from product data
      signTransaction: (tx: string) => Promise<string>
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as any
      const exchangeRate = state.donation.exchangeRate

      // Convert INR to XLM if needed
      let xlmAmount = amount
      if (currency === 'INR') {
        xlmAmount = amount / exchangeRate
      }

      // Import Stellar utils
      const { submitEscrowTransaction, submitDonationTransaction } = await import("@/lib/stellar-utils")

      let result: { success: boolean; hash: string; ledger?: number; stellarResult?: any; data?: any };

      // Use escrow-based donation (which now has internal polling for confirmation)
      result = await submitEscrowTransaction(
        {
          buyerPublicKey: publicKey,
          supplierPublicKey: receiverPublicKey,
          totalAmount: xlmAmount,
          lockedAmount: xlmAmount * 0.5,
          taskId: taskId,
          deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        },
        signTransaction
      )

      if (result.success) {
        return {
          transactionHash: result.hash,
          amount: currency === 'INR' ? amount : (amount * exchangeRate),
          currency: currency,
          taskId,
        }
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Donation failed"
      return rejectWithValue(message)
    }
  }
)

export const fetchDonationHistory = createAsyncThunk(
  "donation/fetchDonationHistory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getOrders()
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.message || "Failed to fetch donations")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch donation history"
      return rejectWithValue(message)
    }
  }
)

const donationSlice = createSlice({
  name: "donation",
  initialState,
  reducers: {
    setCurrentDonation: (state, action) => {
      state.currentDonation = action.payload
    },
    clearCurrentDonation: (state) => {
      state.currentDonation = null
    },
    clearDonationError: (state) => {
      state.error = null
    },
    setExchangeRate: (state, action) => {
      state.exchangeRate = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExchangeRate.fulfilled, (state, action) => {
        state.exchangeRate = action.payload
      })
      .addCase(processDonation.pending, (state) => {
        state.isDonating = true
        state.error = null
      })
      .addCase(processDonation.fulfilled, (state, action) => {
        state.isDonating = false
        state.currentDonation = action.payload
        state.donationHistory.unshift(action.payload)
      })
      .addCase(processDonation.rejected, (state, action) => {
        state.isDonating = false
        state.error = action.payload as string
      })
      .addCase(fetchDonationHistory.fulfilled, (state, action) => {
        state.donationHistory = action.payload
      })
  },
})

export const {
  setCurrentDonation,
  clearCurrentDonation,
  clearDonationError,
  setExchangeRate
} = donationSlice.actions

export default donationSlice.reducer



