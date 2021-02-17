import {
    AsyncThunk,
    AsyncThunkPayloadCreator,
    AsyncThunkPayloadCreatorReturnValue,
    createAsyncThunk,
} from "@reduxjs/toolkit"
import { mapValues } from "lodash"
import { YamDispatch, YamEnv, YamState } from "./redux"

export interface YamThunkApiConfig {
    state: YamState
    dispatch: YamDispatch
    extra: YamEnv
}

export function curriedAsyncThunk<R, T>(
    typePrefix: string,
    payloadCreator: CurriedAsyncThunkPayloadCreator<R, T>,
): AsyncThunk<R, T, YamThunkApiConfig> {
    return createAsyncThunk(
        typePrefix,
        (arg, thunkApi) => payloadCreator(thunkApi)(arg),
        /* , options (type is annoying) */
    )
}

export function curriedAsyncThunks<
    Thunks extends Record<string, CurriedAsyncThunkPayloadCreator<unknown, never>>
>(
    thunks: Thunks,
): {
    [K in keyof Thunks]: Thunks[K] extends CurriedAsyncThunkPayloadCreator<infer R, infer A>
        ? AsyncThunk<R, A, YamThunkApiConfig>
        : never
} {
    return mapValues(thunks, (thunk, key) => curriedAsyncThunk(key, thunk)) as any
}

export type CurriedAsyncThunkPayloadCreator<R, T> = (
    thunkApi: YamThunkApi,
) => (arg: T) => AsyncThunkPayloadCreatorReturnValue<R, YamThunkApiConfig>

// getting hold of the ThunkApi type is hard because not everything is exported so let's infer it
export type YamThunkApi = AsyncThunkPayloadCreator<any, any, YamThunkApiConfig> extends (
    arg: any,
    thunkApi: infer A,
) => any
    ? A
    : never
