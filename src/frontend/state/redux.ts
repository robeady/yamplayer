import { configureStore } from "@reduxjs/toolkit"
import { Explorer } from "../../backend/explorer"
import { Remote } from "../../backend/rpc/client"
import { AudioPlayer } from "./AudioPlayer"
import { catalogueSlice } from "./catalogue"
import { playerSlice } from "./playback"
import { viewSlice } from "./view"

export function createStore(env: YamEnv) {
    return configureStore({
        reducer: { player: playerSlice.reducer, catalogue: catalogueSlice.reducer, view: viewSlice.reducer },
        // TODO: consider turning off slow middleware except if DEBUG=true
        middleware: defaultMiddleware => defaultMiddleware({ thunk: { extraArgument: env } }),
    })
}

export type YamState = ReturnType<ReturnType<typeof createStore>["getState"]>
export type YamDispatch = ReturnType<typeof createStore>["dispatch"]

export interface YamEnv {
    audio: AudioPlayer
    explorer: Remote<Explorer>
}

declare module "react-redux" {
    function useSelector<T>(selector: (state: YamState) => T, equalityFn?: (left: T, right: T) => boolean): T
    function useDispatch(): YamDispatch
}
