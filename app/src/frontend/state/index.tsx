import React, { PropsWithChildren } from "react"
import { createContext, useContextSelector } from "use-context-selector"

interface StateContext<S> {
    Provider: React.Provider<S>
    useContextValue: <T extends unknown>(selector: (state: S) => T) => T
}

export function stateContext<S>(): StateContext<S> {
    const Context = createContext<S>(undefined!)
    return {
        Provider: Context.Provider,
        useContextValue: <T extends unknown>(selector: (state: S) => T) => useContextSelector(Context, selector),
    }
}

export function stateContextButHooky<P, V>(useIt: (props: P) => V) {
    const Context = createContext<V>(undefined!)
    return {
        Provider: React.memo((props: PropsWithChildren<P>) => (
            <Context.Provider value={useIt(props)}>{props.children}</Context.Provider>
        )),
        use: <T extends unknown>(selector: (state: V) => T) => useContextSelector(Context, selector),
    }
}
