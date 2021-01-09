import { useReducer } from "react"

interface StateDescription<State, Reducers> {
    initialState: State
    reducers: Reducers
}

type PayloadType<Reducer> = Reducer extends (state: never, args: infer T) => unknown ? T : never

type ReducerDispatch<Reducers> = <K extends keyof Reducers>(action: { action: K } & PayloadType<Reducers[K]>) => void

export function useReducer2<State, Reducers extends Record<keyof any, (state: State, payload: never) => State>>(
    stateDescription: StateDescription<State, Reducers>,
): [State, ReducerDispatch<Reducers>] {
    const r = stateDescription.reducers

    const reducer = (state: State, action: any) => {
        return r[action.action](state, action as never)
    }

    return useReducer(reducer, stateDescription.initialState)
}

function MyComponent() {
    const [state, dispatch] = useReducer2({
        initialState: 4,
        reducers: {
            hello(s, args: { inc: number }) {
                return s + args.inc
            },
            goodbye(s, args: { name: string }) {
                return args.name === "rob" ? 4 : 5
            },
        },
    })
    dispatch({ action: "goodbye", name: "x" })
}
