import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

interface StatsState {
  leaderboard: any[]
  platformStats: {
    totalProducts: number
    verifiedProducts: number
    totalOrders: number
    totalSuppliers: number
    totalUsdcTransacted: number
  } | null
  isLoading: boolean
  error: string | null
}

const initialState: StatsState = {
  leaderboard: [],
  platformStats: null,
  isLoading: false,
  error: null,
}

export const fetchLeaderboard = createAsyncThunk(
  'stats/fetchLeaderboard',
  async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/community/leaderboard`)
    const data = await res.json()
    return data.data || []
  }
)

export const fetchPlatformStats = createAsyncThunk(
  'stats/fetchPlatformStats',
  async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats`)
    const data = await res.json()
    return data.data
  }
)

// Legacy alias
export const fetchContributors = fetchLeaderboard

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload
        state.isLoading = false
      })
      .addCase(fetchLeaderboard.pending, state => { state.isLoading = true })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed'
      })
      .addCase(fetchPlatformStats.fulfilled, (state, action) => {
        state.platformStats = action.payload
      })
  },
})

export default statsSlice.reducer
