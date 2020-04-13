import React, { PropsWithChildren, SetStateAction, Dispatch, createContext, useContext, useMemo } from "react"
import produce, { Draft } from "immer"
import { createContext as createSelectableContext, useContextSelector } from "use-context-selector"

const identity = <T extends unknown>(t: T) => t

type ImmerUpdater<State> = (recipe: (draft: Draft<State>) => undefined) => void

interface ActionArgs<State> {
    setState: Dispatch<SetStateAction<State>>
    update: ImmerUpdater<State>
}

/** Create a state container, where mutations are wrapped in actions specified at creation time. */
export function createStateWithActions<State, Props, Actions>(
    defaultInitialState: State,
    actionsCreator: (props: Props) => (args: ActionArgs<State>) => Actions,
) {
    const { Provider, useState, useDispatch } = createState((props: { initialState?: State } & Props) => {
        const [state, setState] = React.useState(props.initialState ?? defaultInitialState)
        const actions = useMemo(
            () => actionsCreator(props)({ setState, update: immerise(setState) }),
            [props], // setState is unnecessary because it's stable
        )
        return [state, actions]
    })
    return { Provider, useState, useActions: useDispatch }
}

/** Create a bare state container, which exposes operations to set or update the state directly */
export function defineBareState<State>(defaultInitialState: State) {
    const { Provider, useState, useDispatch: useSetState } = createState((props: { initialState?: State }) => {
        return React.useState(props.initialState ?? defaultInitialState)
    })
    return { Provider, useState, useSetState, useUpdate: () => immerise(useSetState()) }
}

/** Create a state container, given a custom state hook */
export function createState<State, Props, Dispatch>(useCustomState: (props: Props) => readonly [State, Dispatch]) {
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
    return (recipe: (draft: Draft<State>) => undefined) => setState(produce(recipe) as any)
}
