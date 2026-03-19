import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

export interface SupplierProfile {
  id: string
  name: string
  email: string
  registrationNumber: string
  description: string
  logo?: string
  publicKey?: string
  createdAt: string  // ISO string, not Date object (for Redux serialization)
}

/** @deprecated Use SupplierProfile instead */
export type NGOProfile = SupplierProfile

interface UserAuthState {
  isAuthenticated: boolean
  supplierProfile: SupplierProfile | null
  isLoading: boolean
  error: string | null
  fieldErrors: Record<string, string> | null
}

const initialState: UserAuthState = {
  isAuthenticated: false,
  supplierProfile: null,
  isLoading: false,
  error: null,
  fieldErrors: null,
}

// Helper function to set cookies safely
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document !== 'undefined') {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/`;
  }
};

export const loginSupplier = createAsyncThunk(
  "userAuth/login",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { login } = await import("@/lib/api-service")
      const response = await login({ email, password })

      if (response.success && response.data) {
        const { accessToken, refreshToken, userData } = response.data

        // Convert backend user data to frontend format
        const supplierProfile: SupplierProfile = {
          id: userData.Id,
          name: userData.supplierName,
          email: userData.Email,
          registrationNumber: userData.RegNumber,
          description: userData.Description,
          publicKey: userData.PublicKey,
          createdAt: userData.createdAt || new Date().toISOString(),
        }

        // Store tokens and profile in client-side storage
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          localStorage.setItem('supplier_profile', JSON.stringify(supplierProfile))

          // Set cookies for authentication
          setCookie('accessToken', accessToken)
          setCookie('refreshToken', refreshToken)
          setCookie('supplier_profile', JSON.stringify(supplierProfile))
        }

        return supplierProfile
      } else {
        throw new Error(response.message || "Login failed")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed"
      return rejectWithValue(message)
    }
  },
)

/** @deprecated Use loginSupplier instead */
export const loginNGO = loginSupplier

export const signupSupplier = createAsyncThunk(
  "userAuth/signup",
  async (supplierData: any, { rejectWithValue }) => {
    try {
      const { signup } = await import("@/lib/api-service")
      const response = await signup({
        ngoName: supplierData.name || supplierData.ngoName,
        regNumber: supplierData.registrationNumber || supplierData.regNumber,
        description: supplierData.description,
        email: supplierData.email,
        phoneNo: supplierData.phoneNo,
        password: supplierData.password,
      })

      if (response.success && response.data) {
        const { accessToken, refreshToken, userData } = response.data

        // Store in localStorage for frontend access
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
        }

        // Set cookies for authentication (backend uses these)
        document.cookie = `accessToken=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days
        document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`

        // Convert backend user data to frontend format
        const supplierProfile: SupplierProfile = {
          id: userData.Id,
          name: userData.supplierName,
          email: userData.Email,
          registrationNumber: userData.RegNumber,
          description: userData.Description,
          publicKey: userData.PublicKey,
          createdAt: userData.createdAt || new Date().toISOString(),
        }

        // Store supplier profile in localStorage and cookie
        if (typeof window !== 'undefined') {
          localStorage.setItem('supplier_profile', JSON.stringify(supplierProfile))
        }
        document.cookie = `supplier_profile=${encodeURIComponent(JSON.stringify(supplierProfile))}; path=/; max-age=${7 * 24 * 60 * 60}`

        return supplierProfile
      } else {
        throw new Error(response.message || "Signup failed")
      }
    } catch (error: any) {
      return rejectWithValue({
        message: error.message || "Signup failed",
        errors: error.errors
      })
    }
  },
)

/** @deprecated Use signupSupplier instead */
export const signupNGO = signupSupplier

export const fetchCurrentUser = createAsyncThunk(
  "userAuth/checkCookie",
  async (_, { rejectWithValue }) => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      // Try localStorage first (new key)
      let profileStr = localStorage.getItem('supplier_profile')
      // Fallback to legacy key
      if (!profileStr) {
        profileStr = localStorage.getItem('ngo_profile')
        if (profileStr) {
          // Migrate to new key
          localStorage.setItem('supplier_profile', profileStr)
          localStorage.removeItem('ngo_profile')
        }
      }
      if (profileStr) {
        try {
          return JSON.parse(profileStr) as SupplierProfile
        } catch (parseError) {
          localStorage.removeItem('supplier_profile')
          localStorage.removeItem('ngo_profile')
        }
      }

      // Fallback to cookies
      const cookies = document.cookie.split("; ").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.split("=")
          acc[key] = value
          return acc
        },
        {} as Record<string, string>,
      )

      const cookieProfile = cookies.supplier_profile || cookies.ngo_profile
      if (cookieProfile) {
        try {
          const profile = JSON.parse(decodeURIComponent(cookieProfile))
          // Sync localStorage
          localStorage.setItem('supplier_profile', JSON.stringify(profile))
          return profile as SupplierProfile
        } catch (err) {
          return null
        }
      }
    } catch (error) {
      return null
    }

    return null
  },
)

const userAuthSlice = createSlice({
  name: "userAuth",
  initialState,
  reducers: {
    logoutUser: (state) => {
      // Clear all auth-related data from localStorage and cookies
      if (typeof window !== 'undefined') {
        // Clear authentication data
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('supplier_profile')
        localStorage.removeItem('ngo_profile') // legacy cleanup

        // Clear wallet data from localStorage
        localStorage.removeItem('wallet_connected')
        localStorage.removeItem('wallet_type')
        localStorage.removeItem('wallet_publicKey')
        localStorage.removeItem('wallet_balance')

        // Clear session storage
        sessionStorage.clear()
      }

      // Clear all auth cookies
      const cookieOptions = 'path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
      document.cookie = `accessToken=; ${cookieOptions}`
      document.cookie = `refreshToken=; ${cookieOptions}`
      document.cookie = `supplier_profile=; ${cookieOptions}`
      document.cookie = `ngo_profile=; ${cookieOptions}` // legacy cleanup

      // Clear wallet-related cookies
      document.cookie = `wallet_connected=; ${cookieOptions}`
      document.cookie = `wallet_address=; ${cookieOptions}`
      document.cookie = `wallet_type=; ${cookieOptions}`

      // Clear all cookies (brute force approach for development)
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        document.cookie = `${name}=; ${cookieOptions}`
      }

      // Reset state
      state.isAuthenticated = false
      state.supplierProfile = null
      state.error = null

      // Force a full page reload to ensure all state is cleared
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    },
    clearSupplierError: (state) => {
      state.error = null
      state.fieldErrors = null
    },
    checkSupplierCookie: (state) => {
      // Check if supplier is already logged in via cookies
      if (typeof window !== "undefined") {
        const cookies = document.cookie.split("; ").reduce(
          (acc, cookie) => {
            const [key, value] = cookie.split("=")
            acc[key] = value
            return acc
          },
          {} as Record<string, string>,
        )

        const cookieProfile = cookies.supplier_profile || cookies.ngo_profile
        if (cookies.accessToken && cookieProfile) {
          try {
            const profile = JSON.parse(decodeURIComponent(cookieProfile))
            state.supplierProfile = profile
            state.isAuthenticated = true
          } catch (err) {
            // Clear corrupted cookies
            document.cookie = "supplier_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
            document.cookie = "ngo_profile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginSupplier.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginSupplier.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.supplierProfile = action.payload
      })
      .addCase(loginSupplier.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(signupSupplier.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signupSupplier.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.supplierProfile = action.payload
      })
      .addCase(signupSupplier.rejected, (state, action: any) => {
        state.isLoading = false
        if (action.payload && typeof action.payload === 'object') {
          state.error = action.payload.message
          if (action.payload.errors) {
            const fieldErrors: Record<string, string> = {}
            action.payload.errors.forEach((err: any) => {
              const field = err.path.split('.').pop()
              fieldErrors[field] = err.message
            })
            state.fieldErrors = fieldErrors
          }
        } else {
          state.error = action.payload as string || "Signup failed"
        }
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.isAuthenticated = true
          state.supplierProfile = action.payload as SupplierProfile
        }
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false
      })
  },
})

export const { logoutUser, clearSupplierError, checkSupplierCookie } = userAuthSlice.actions

/** @deprecated Use clearSupplierError instead */
export const clearNGOError = clearSupplierError
/** @deprecated Use checkSupplierCookie instead */
export const checkNGOCookie = checkSupplierCookie

export default userAuthSlice.reducer
