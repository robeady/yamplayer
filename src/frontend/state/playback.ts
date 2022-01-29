import { createSlice } from "@reduxjs/toolkit"
import { Fraction } from "../../util/types"
import { PA } from "./actions"
import { emptyAudioQueue, ShuffledAudioQueue } from "./queue"

interface PlayerState {
    status: PlaybackStatus
    volume: Fraction
    muted: boolean
    queue: ShuffledAudioQueue
    repeat: boolean
    shuffle: boolean
}

export type PlaybackStatus =
    | { state: "stopped" }
    | { state: "paused"; position: number }
    | { state: "playing"; sinceMillis: number; positionAtTimestamp: number }
    | { state: "loading" }

const initialState: PlayerState = {
    status: { state: "stopped" },
    volume: 0.2,
    muted: false,
    queue: emptyAudioQueue(),
    repeat: false,
    shuffle: false,
}

export const playerSlice = createSlice({
    name: "player",
    initialState,
    reducers: {
        volumeChanged: (state, { payload: { volume, muted } }: PA<{ volume: number; muted: boolean }>) => ({
            ...state,
            volume,
            muted,
        }),
        queueChanged: (s, { payload: queue }: PA<ShuffledAudioQueue>) => ({ ...s, queue }),
        playbackPaused: (s, { payload: position }: PA<number>) => ({
            ...s,
            status: { state: "paused", position },
        }),
        playbackResumed: (s, { payload }: PA<{ sinceMillis: number; positionAtTimestamp: number }>) => ({
            ...s,
            status: { state: "playing", ...payload },
        }),
        playbackStopped: s => ({ ...s, status: { state: "stopped" } }),
        playbackLoading: s => ({ ...s, status: { state: "loading" } }),
        modeChanged: (
            state,
            { payload: { repeat, shuffle } }: PA<{ repeat: boolean; shuffle: boolean }>,
        ) => ({ ...state, repeat, shuffle }),
    },
})
