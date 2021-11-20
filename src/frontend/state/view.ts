import { createSlice } from "@reduxjs/toolkit"
import { PA } from "./actions"

interface ViewState {
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
