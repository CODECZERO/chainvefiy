import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { apiClient } from "@/lib/api-client"

interface Community {
    id: string
    _id: string
    name: string
    description: string
    memberCount: number
    tasks: any[]
    members: string[]
    createdAt: string
}

interface CommunityState {
    communities: Community[]
    currentCommunity: Community | null
    isLoading: boolean
    error: string | null
    lastFetched: number | null
}

const initialState: CommunityState = {
    communities: [],
    currentCommunity: null,
    isLoading: false,
    error: null,
    lastFetched: null,
}

const CACHE_TTL = 5 * 60 * 1000

export const fetchCommunities = createAsyncThunk(
    "communities/fetchAll",
    async (force: boolean = false, { getState, rejectWithValue }) => {
        const state = (getState() as any).communities as CommunityState
        const now = Date.now()
        if (!force && state.lastFetched && now - state.lastFetched < CACHE_TTL && state.communities.length > 0) {
            return state.communities
        }
        try {
            const response = await apiClient.request<any>('/community/all')
            return response.data
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch communities")
        }
    }
)

export const fetchCommunityById = createAsyncThunk(
    "communities/fetchById",
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await apiClient.request<any>(`/community/${id}`)
            return response.data
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch community details")
        }
    }
)

const communitySlice = createSlice({
    name: "communities",
    initialState,
    reducers: {
        clearCurrentCommunity: (state) => {
            state.currentCommunity = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCommunities.pending, (state) => {
                state.isLoading = true
            })
            .addCase(fetchCommunities.fulfilled, (state, action) => {
                state.isLoading = false
                state.communities = action.payload || []
                state.lastFetched = Date.now()
            })
            .addCase(fetchCommunities.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
            .addCase(fetchCommunityById.pending, (state) => {
                state.isLoading = true
            })
            .addCase(fetchCommunityById.fulfilled, (state, action) => {
                state.isLoading = false
                state.currentCommunity = action.payload
            })
            .addCase(fetchCommunityById.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })
    },
})

export const { clearCurrentCommunity } = communitySlice.actions
export default communitySlice.reducer
