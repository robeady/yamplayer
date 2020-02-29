import React, { PropsWithChildren, ReactType } from "react"
import { createContext as createSelectableContext, useContextSelector } from "use-context-selector"

// TODO: better name
interface StateContext<Props, State, Actions> {
    useState(): State
    useState<T>(selector: (state: State) => T): T
    useActions(): Actions
    Provider: ReactType<Props>
}

export function createState<Props, State, Actions>(
    useCustomState: (props: Props) => readonly [State, Actions],
): StateContext<Props, State, Actions> {
    const StateContext = createSelectableContext<State>(undefined!)
    // TODO: we could use an ordinary context here, but maybe it's better to the two contexts behave consistently with each other?
    const ActionsContext = createSelectableContext<Actions>(undefined!)
    return {
        useState: <T extends unknown>(selector?: (state: State) => T) =>
            useContextSelector(StateContext, selector ?? (identity as any)) as any,
        useActions: () => useContextSelector(ActionsContext, identity),
        // TODO: do we need some memo here?
        Provider: (props: PropsWithChildren<Props>) => {
            const [state, actions] = useCustomState(props)
            return (
                <ActionsContext.Provider value={actions}>
                    <StateContext.Provider value={state}>{props.children}</StateContext.Provider>
                </ActionsContext.Provider>
            )
        },
    }
}

const identity = <T extends unknown>(t: T) => t
