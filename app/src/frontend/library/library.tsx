import { Dict } from "../util/types"
import { TrackSearchResult, DeezerApiClient } from "../../backend/deezer/gateway"
import { remote } from "../../backend/rpc/client"
import React, {
    useState,
    ReactChildren,
    PropsWithChildren,
    useMemo,
    useRef,
    createContext,
    useReducer,
    useEffect,
} from "react"
import { stateContext, stateContextButHooky } from "../state"
import { createContext as createSelectableContext, useContextSelector } from "use-context-selector"

interface LibraryState {
    searchResultsByQuery: Dict<TrackSearchResult[]>
}

const { Provider, useContextValue } = stateContext<LibraryState>()

export const useLibrary = useContextValue

export class LibraryProvider extends React.PureComponent<{ backendUrl: string }, LibraryState> {
    private client = remote<DeezerApiClient>(`${this.props.backendUrl}/deezer`)

    readonly state: LibraryState = {
        searchResultsByQuery: {},
    }

    actions = {
        search: async (query: string): Promise<TrackSearchResult[]> => {
            if (query in this.state.searchResultsByQuery) {
                return this.state.searchResultsByQuery[query]
            } else {
                const results = await this.client.searchTracks(query)
                this.setState(s => ({
                    searchResultsByQuery: { ...s.searchResultsByQuery, [query]: results },
                }))
                return results
            }
        },
    }

    render() {
        return <Provider value={{ ...this.state, ...this.actions }}>{this.props.children}</Provider>
    }
}

//
//
// AND NOW BACK TO HOOKS
//
//
//

function useLibraryState(props: { backendUrl: string }) {
    const client = useMemo(() => remote<DeezerApiClient>(`${props.backendUrl}/deezer`), [props.backendUrl])
    console.time("making actions and state")
    const [state, setState] = useState({
        searchResultsByQuery: {} as Dict<TrackSearchResult[]>,
    })
    const actions = {
        search: async (query: string): Promise<TrackSearchResult[]> => {
            if (query in state.searchResultsByQuery) {
                return state.searchResultsByQuery[query]
            } else {
                const results = await client.searchTracks(query)
                setState(s => ({
                    searchResultsByQuery: { ...s.searchResultsByQuery, [query]: results },
                }))
                return results
            }
        },
    }
    console.timeEnd("making actions and state")
    return { ...state, ...actions }
}

export const Library = stateContextButHooky(useLibraryState)

//
//
// A BETTER HOOKS VERSION
//
//
//

type SetterArg<S> = S | ((oldState: S) => S)
type Setter<S> = (update: SetterArg<S>) => void

interface Args<S> {
    get: () => S
    set: Setter<S>
}

const betterLibrary = makeMeSomeState((props: { backendUrl: string }) => {
    const client = remote<DeezerApiClient>(`${props.backendUrl}/deezer`)
    const initialState = {
        searchResultsByQuery: {} as Dict<TrackSearchResult[] | "loading" | "error">,
    }
    const queries = ({ get, set }: Args<typeof initialState>) => ({
        getSearchResults: (query: string): TrackSearchResult[] | "loading" | "error" => {
            useEffect(() => {
                set(s => ({ searchResultsByQuery: { ...s.searchResultsByQuery, [query]: "loading" } }))
                client
                    .searchTracks(query)
                    .then(r => set(s => ({ searchResultsByQuery: { ...s.searchResultsByQuery, [query]: r } })))
                    .catch(() => set(s => ({ searchResultsByQuery: { ...s.searchResultsByQuery, [query]: "error" } })))
            }, [query])
            return get().searchResultsByQuery[query] ?? "loading"
        },
    })

    return { initialState, queries, actions: () => undefined }
})

interface StateThings<State, Queries, Actions> {
    initialState: State
    queries: (args: Args<State>) => Queries
    actions: (args: Args<State>) => Actions
}
function makeMeSomeState<Props, State extends Dict, Queries, Actions extends Dict<() => undefined> | undefined>(
    maker: (props: Props) => StateThings<State, Queries, Actions>,
) {
    const ActionsContext = createContext<Actions>(undefined!)
    const StateAndQueriesContext = createSelectableContext<[State, Queries]>(undefined!)
    const Provider = (props: PropsWithChildren<Props>) => {
        const instance = useMemo(() => maker(props), [props])
        const stateRef = useRef(instance.initialState)
        const enqueueRerender = useReducer(x => x + 1, 0)[1]
        // if props change, reset state to initial
        useEffect(() => {
            if (instance.initialState !== stateRef.current) {
                stateRef.current = instance.initialState
                enqueueRerender()
            }
        }, [props])
        // stateRef and enqueueRerender are stable, so we can set up the actions/queries just once
        const [actions, queries] = useMemo(() => {
            const args: Args<State> = {
                // hmm: an action/query could see a different state to what useState returns if a re-render is pending
                get: () => stateRef.current,
                set: update => {
                    stateRef.current = typeof update === "function" ? update(stateRef.current) : update
                    enqueueRerender()
                },
            }
            return [instance.actions(args), instance.queries(args)]
        }, [])
        return (
            <ActionsContext.Provider value={actions}>
                <StateAndQueriesContext.Provider value={[stateRef.current, queries]}>
                    {props.children}
                </StateAndQueriesContext.Provider>
            </ActionsContext.Provider>
        )
    }
    const useActions = () => React.useContext(ActionsContext)
    const useQuery = <R extends unknown>(selector: (q: Queries) => R) =>
        useContextSelector(StateAndQueriesContext, ([_, queries]) => selector(queries))

    return { Provider, useState, useQuery, useActions }
}

export function betterHooky<P, V>(useIt: (props: P) => V) {
    const Context = createContext<V>(undefined!)
    return {
        Provider: React.memo((props: PropsWithChildren<P>) => (
            <Context.Provider value={useIt(props)}>{props.children}</Context.Provider>
        )),
        use: <T extends unknown>(selector: (state: V) => T) => useContextSelector(Context, selector),
    }
}

//
//
//
//
// SOMETHING SIMPLER
//
//
//

abstract class StateManager<Props, State> {
    constructor(protected props: Props, private getState: () => State, protected setState: SetState<State>) {}

    abstract initialState: State

    public get state() {
        return this.getState()
    }

    protected set(update: SetterArg<State>) {
        return this.setState(update)
    }

    protected merge<K extends keyof State>(
        update: ((prevState: Readonly<State>) => Pick<State, K> | State | null) | (Pick<State, K> | State | null),
    ) {
        return this.setState(update)
    }
}

class LibraryClassy extends StateManager<{ backendUrl: string }, LibraryState> {
    private client = remote<DeezerApiClient>(`${this.props.backendUrl}/deezer`)

    initialState = {
        searchResultsByQuery: {},
    }

    search = async (query: string): Promise<TrackSearchResult[]> => {
        if (query in this.state.searchResultsByQuery) {
            return this.state.searchResultsByQuery[query]
        } else {
            const results = await this.client.searchTracks(query)
            this.set(s => ({
                searchResultsByQuery: { ...s.searchResultsByQuery, [query]: results },
            }))
            return results
        }
    }
}

const toExport = doTheStateThing(LibraryClassy)

//
//
// AND THE IMPLEMENTATION...
//
//
//

interface SetState<S, P = unknown> {
    <K extends keyof S>(
        state: ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null) | (Pick<S, K> | S | null),
        callback?: () => void,
    ): void
}

type StateManagerConstructor<Props, State, Class extends StateManager<Props, State>> = new (
    props: Props,
    getState: () => State,
    setState: SetState<State>,
) => Class

function createStateProvider<Props, State, Class extends StateManager<Props, State>>(
    stateManagerClass: StateManagerConstructor<Props, State, Class>,
    Context: React.Context<Class>,
) {
    return class StateProvider extends React.PureComponent<Props, State> {
        stateManager: Class

        constructor(props: Props) {
            super(props)
            this.stateManager = new stateManagerClass(props, () => this.state, this.setState)
            this.state = this.stateManager.initialState
        }

        render() {
            return <Context.Provider value={this.stateManager}>{this.props.children}</Context.Provider>
        }
    }
}

function doTheStateThing<Props, State, Class extends StateManager<Props, State>>(
    stateManagerClass: StateManagerConstructor<Props, State, Class>,
) {
    const Context = createSelectableContext<Class>(undefined!)
    const Provider = createStateProvider(stateManagerClass, Context)
    const use = <D extends unknown>(selector: (value: Class) => D) => useContextSelector(Context, selector)
    return { Provider, use }
}
