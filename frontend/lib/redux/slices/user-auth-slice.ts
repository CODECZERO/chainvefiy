import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export interface UserProfile {
  id: string
  email: string
  role: 'SUPPLIER' | 'BUYER' | 'VERIFIER' | 'ADMIN'
  stellarWallet?: string
  supplierProfile?: {
    id: string
    name: string
    trustScore: number
    isVerified: boolean
  } | null
}

interface UserAuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  isLoading: boolean
  error: string | null
}

const initialState: UserAuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
}

export const fetchCurrentUser = createAsyncThunk('userAuth/fetchMe', async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/me`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Not authenticated')
  const data = await res.json()
  return data.data as UserProfile
})

export const loginUser = createAsyncThunk(
  'userAuth/login',
  async (creds: { email: string; password: string }) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Login failed')
    
    // Trigger sync for other tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_sync', Date.now().toString())
    }
    
    return data.data.user as UserProfile
  }
)

export const logoutUser = createAsyncThunk('userAuth/logout', async () => {
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  
  // Trigger sync for other tabs
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_sync')
    localStorage.setItem('auth_logout', Date.now().toString())
  }
})

const userAuthSlice = createSlice({
  name: 'userAuth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isAuthenticated = true
        state.user = action.payload
        state.isLoading = false
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.isLoading = false
      })
      .addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true
        state.user = action.payload
        state.isLoading = false
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Login failed'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
      })
  },
})

export const { clearError } = userAuthSlice.actions
export default userAuthSlice.reducer
