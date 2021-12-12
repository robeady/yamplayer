import { createSlice } from "@reduxjs/toolkit"
import { PA } from "./actions"

interface ViewState {
    // TODO: this is bad, because the same track ID could appear multiple times in a list. maybe this slice should go away entirely
    selectedTrackId?: string
}

export const viewSlice = createSlice({
    name: "view",
    initialState: {} as ViewState,
    reducers: {
        selectedTrackChanged(state, { payload: selectedTrackId }: PA<string | undefined>) {
            return { ...state, selectedTrackId }
        },
    },
})
