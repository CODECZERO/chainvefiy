import { configureStore } from '@reduxjs/toolkit'
import walletReducer from './slices/wallet-slice'
import uiReducer from './slices/ui-slice'
import userAuthReducer from './slices/user-auth-slice'
import communityReducer from './slices/community-slice'
import statsReducer from './slices/stats-slice'

// Keep supplier-auth-slice for backward compat with any remaining components
import legacyAuthReducer from './slices/supplier-auth-slice'

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    ui: uiReducer,
    userAuth: userAuthReducer,
    supplierAuth: legacyAuthReducer,       // legacy — kept so old components don't crash
    community: communityReducer,
    stats: statsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
