import React, { PropsWithChildren, SetStateAction, Dispatch, createContext, useContext } from "react"
import produce, { Draft } from "immer"
import { createContext as createSelectableContext, useContextSelector } from "use-context-selector"

const identity = <T extends unknown>(t: T) => t

type ImmerUpdater<State> = (recipe: (draft: Draft<State>) => void) => void

/** Create a state container, given a custom state hook */
export function createState<Props, State, Dispatch>(
    useCustomState: (props: Props) => readonly [State, Dispatch],
) {
    const StateContext = createSelectableContext<State>(undefined!)
    // TODO: is it safe for this context to be an ordinary context, or are we worried about inconsistencies?
    const DispatchContext = createContext<Dispatch>(undefined!)

    const useState = <T extends unknown>(selector?: (state: State) => T) =>
        useContextSelector<State, T>(StateContext, selector ?? (identity as any))

    const useDispatch = () => useContext(DispatchContext)

    const Provider = (props: PropsWithChildren<Props>) => {
        const [state, action] = useCustomState(props)
        return (
            <DispatchContext.Provider value={action}>
                <StateContext.Provider value={state}>{props.children}</StateContext.Provider>
            </DispatchContext.Provider>
        )
    }

    return { Provider, useState, useDispatch }
}

export function immerise<State>(setState: Dispatch<SetStateAction<State>>): ImmerUpdater<State> {
    return (recipe: (draft: Draft<State>) => void) => setState(produce(draft => void recipe(draft)))
}
