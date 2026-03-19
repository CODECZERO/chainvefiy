import { createSlice } from "@reduxjs/toolkit"

interface UIState {
  showAuthModal: boolean
  authMode: "login" | "signup" | null
  searchQuery: string
}

const initialState: UIState = {
  showAuthModal: false,
  authMode: null,
  searchQuery: "",
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openAuthModal: (state, action) => {
      state.showAuthModal = true
      if (action.payload) {
        state.authMode = action.payload
      } else {
        state.authMode = null
      }
    },
    closeAuthModal: (state) => {
      state.showAuthModal = false
      state.authMode = null
    },
    setAuthMode: (state, action) => {
      state.authMode = action.payload
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
    },
  },
})

export const { openAuthModal, closeAuthModal, setAuthMode, setSearchQuery } = uiSlice.actions
export default uiSlice.reducer
