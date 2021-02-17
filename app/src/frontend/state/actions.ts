import { AnyAction, PayloadAction, Slice, ThunkAction } from "@reduxjs/toolkit"
import { AudioPlayer } from "./AudioPlayer"
import { catalogueSlice, catalogueThunks } from "./catalogue"
import { playerSlice } from "./playback"
import { YamEnv, YamState } from "./redux"
import { viewSlice } from "./view"

export type PA<P> = PayloadAction<P>

export const audio = thunkActions("audio", AudioPlayer)
export const catalogue = { ...catalogueSlice.actions, ...catalogueThunks }
export const player = playerSlice.actions
export const view = viewSlice.actions

export type PlayerAction = SliceAction<typeof playerSlice>

export type SliceAction<T extends Slice> = {
    [K in keyof T["actions"]]: T["actions"][K] extends (...args: any[]) => infer A ? A : never
}[keyof T["actions"]]

/**
 * Given a class that is a member of the environment dict, and the name of its key in the environment dict,
 * produces a dict of thunk action creators each corresponding to a method on the class.
 */
function thunkActions<K extends keyof YamEnv, T extends YamEnv[K]>(
    nameInEnv: K,
    clazz: { prototype: T },
): {
    [K in FunctionKeysIn<T>]: T[K] extends (...args: infer A) => unknown
        ? ThunkActionCreator<A, ReturnType<T[K]>>
        : never
} {
    const methodNames = Object.getOwnPropertyNames(clazz.prototype).filter(
        name => name !== "constructor" && typeof clazz.prototype[name as keyof T] === "function",
    ) as (keyof YamEnv[K])[]
    return Object.fromEntries(
        methodNames.map(methodName => {
            const thunkCreator: ThunkActionCreator<never[], unknown> = (...args) => (_, __, extra) =>
                (extra[nameInEnv][methodName] as any)(...args)
            return [methodName, thunkCreator]
        }),
    ) as any
}

type FunctionKeysIn<T> = { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never }[keyof T]

export type ThunkActionCreator<A extends unknown[], R> = (
    ...args: A
) => ThunkAction<R, YamState, YamEnv, AnyAction>
