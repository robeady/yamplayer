import { createContainer } from "react-tracked"
import { memo, useState, ComponentType, useMemo } from "react"

/* A wrapper around react-tracked that supports actions and state declared together */

export type Setter<S> = React.Dispatch<React.SetStateAction<S>>

export type Args<S> = {
    set: Setter<S>
    get: () => S
}

export interface StateUnit<State, Props, Actions> {
    Provider: ComponentType<Props>
    useState(): State
    useState<T>(selector: (state: State) => T): T
    useActions: () => Actions
}

export function makeState<State, Actions, Props>(
    creator: (
        props: Props,
    ) => {
        initialState: State
        actions: (args: Args<State>) => Actions
    },
): StateUnit<State, Props, Actions> {
    const container = createContainer((props: Props) => {
        console.log("creating container")
        const instance = useMemo(() => creator(props), [props])
        const [state, setState] = useState(instance.initialState)
        return [state, instance.actions({ set: setState, get: () => state /* TODO: wrong */ })]
    })
    return {
        Provider: container.Provider,
        useState: <T>(selector?: (state: State) => T) =>
            selector === undefined ? container.useTracked()[0] : container.useSelector(selector),
        useActions: container.useUpdate,
    }
}
