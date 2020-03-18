import React, { useEffect, PropsWithChildren, SetStateAction, Dispatch, createContext, useContext } from "react"

import { createContext as createSelectableContext, useContextSelector } from "use-context-selector"

const identity = <T extends unknown>(t: T) => t

// idea:
// first layer is a state component
// on top of that, build actions
// on top of that, if needed, build queries

// potential pitfall: lots of layers of providers
// we only want two providers: one for the underlying state, another for the stable stuff on top (actions, queries etc)

function defineState<State>(defaultInitialState: State) {
    const StateContext = createSelectableContext<State>(undefined!)
    const UpdateContext = createContext<Dispatch<SetStateAction<State>>>(undefined!)

    const useState = <T extends unknown>(selector?: (state: State) => T) =>
        useContextSelector<State, T>(StateContext, selector ?? (identity as any))

    const useUpdate = () => useContext(UpdateContext)

    // TODO: do we need some memo here?
    const Provider = (props: PropsWithChildren<{ initialState?: State }>) => {
        const [state, setState] = React.useState(props.initialState ?? defaultInitialState)
        return (
            <UpdateContext.Provider value={setState}>
                <StateContext.Provider value={state}>{props.children}</StateContext.Provider>
            </UpdateContext.Provider>
        )
    }

    return {
        useState,
        useUpdate,
        Provider,
    }
}

function attachActions<State, Actions>(already: ReturnType<typeof defineState>) {
    return {
        useState: already.useState,
        useActions:
    }
}
