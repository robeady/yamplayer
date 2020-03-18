import React, { useEffect, PropsWithChildren } from "react"
import { Dict } from "../util/types"
import { mapValues, ObjectIterator, isFunction } from "lodash"
import { createContext as createSelectableContext, useContextSelector } from "use-context-selector"

const identity = <T extends unknown>(t: T) => t

type SetState<S> = (newState: S) => void

interface Query<State, Result> {
    selector: (s: State) => Result
    fetch: (setState: SetState<State>) => void
}

function createState<Props>(name: string): StateBuilder1<Props> {
    return {
        initially: <State extends object>(createInitialState: (props: Props) => State) => ({
            actions: <Actions extends Dict<() => void>>(createActions: (setState: SetState<State>) => Actions) => ({
                queries: <Queries extends Dict<((...args: any[]) => Query<State, unknown>) | Query<State, unknown>>>(
                    queries: Queries,
                ) => ({
                    build: () => {
                        const StateContext = createSelectableContext<State>(undefined!)
                        // TODO: we could use an ordinary context here, but maybe it's better to the two contexts behave consistently with each other?
                        const ActionsContext = createSelectableContext<[Actions, SetState<State>]>(undefined!)

                        const useState = <T extends unknown>(selector?: (state: State) => T) =>
                            useContextSelector<State, T>(StateContext, selector ?? (identity as any))

                        const useActions = () => useContextSelector(ActionsContext, identity)[0]

                        const queryHooks = mapObjectValues(queries, q => (...args: unknown[]) => {
                            const query: Query<State, unknown> = isFunction(q) ? q(...args) : q
                            const relevantState = useState(query.selector)
                            const setState = useContextSelector(ActionsContext, identity)[1]
                            useEffect(() => {
                                if (relevantState === undefined) {
                                    query.fetch(setState)
                                }
                            }, [relevantState, setState])
                            return relevantState
                        }) as Querise<State, Queries>

                        // TODO: do we need some memo here?
                        const Provider = (props: PropsWithChildren<Props>) => {
                            const [state, setState] = React.useState(() => createInitialState(props))
                            const actions = React.useMemo(() => createActions(setState), [setState])
                            return (
                                <ActionsContext.Provider value={[actions, setState]}>
                                    <StateContext.Provider value={state}>{props.children}</StateContext.Provider>
                                </ActionsContext.Provider>
                            )
                        }
                        Provider.displayName = name + " state provider"

                        return {
                            useState,
                            useActions,
                            Provider,
                            queries: queryHooks,
                        }
                    },
                }),
            }),
        }),
    }
}

function mapObjectValues<O extends object, R>(object: O, transform: ObjectIterator<O, R>): { [K in keyof O]: R } {
    return mapValues(object, transform)
}

interface StateBuilder1<Props> {
    initially: <State extends object>(createInitialState: (props: Props) => State) => StateBuilder2<Props, State>
}

interface StateBuilder2<Props, State> /* extends StateBuilder3<Props, State, undefined> */ {
    actions: <Actions extends Dict<() => void>>(
        actions: (setState: SetState<State>) => Actions,
    ) => StateBuilder3<Props, State, Actions>
}

interface StateBuilder3<Props, State, Actions> /* extends StateBuilder4<Props, State, Actions, undefined> */ {
    queries: <Q extends Dict<((...args: any[]) => Query<State, unknown>) | Query<State, unknown>>>(
        queries: Q,
    ) => StateBuilder4<Props, State, Actions, Querise<State, Q>>
}

interface StateBuilder4<Props, State, Actions, Queries> {
    build: () => BuiltState<Props, State, Actions, Queries>
}

type Querise<State, Q extends Dict<((...args: any[]) => Query<State, unknown>) | Query<State, unknown>>> = {
    [K in keyof Q]: Q[K] extends Query<State, unknown>
        ? ReturnType<Q[K]["selector"]>
        : Q[K] extends (...args: any[]) => Query<State, unknown>
        ? (...args: Parameters<Q[K]>) => ReturnType<ReturnType<Q[K]>["select"]>
        : never
}

interface BuiltState<P, S, A, Q> {
    queries: Q
    useState(): S
    useState<T extends unknown>(selector: (state: S) => T): T
    useActions: () => A
    Provider: React.FunctionComponent<PropsWithChildren<P>>
}

function LibraryState(props: { volume: number }) {
    return initialState({ playing: !!props.volume }).attach(setState => ({
        actions: {
            doStuff: () => setState({ playing: false }),
        },
        queries: {
            useFoo: (a: number) => ({
                selector: s => s.playing,
                fetch: () => void 12,
            }),
        },
    }))
}

function buildState<Props, State, Actions, Queries extends QueriesBase<State> | undefined>(
    provider: (props: Props) => StatePrototype<State, Actions, Queries>,
): BuiltState<Props, State, Actions, Queries> {
    const StateContext = createSelectableContext<State>(undefined!)
    // TODO: we could use an ordinary context here, but maybe it's better to the two contexts behave consistently with each other?
    const ActionsContext = createSelectableContext<[Actions, Queries]>(undefined!)

    const useState = <T extends unknown>(selector?: (state: State) => T) =>
        useContextSelector<State, T>(StateContext, selector ?? (identity as any))

    const useActions = () => useContextSelector(ActionsContext, identity)[0]

    const queryHooks = mapObjectValues(queries, q => (...args: unknown[]) => {
        const query: Query<State, unknown> = isFunction(q) ? q(...args) : q
        const relevantState = useState(query.selector)
        const setState = useContextSelector(ActionsContext, identity)[1]
        useEffect(() => {
            if (relevantState === undefined) {
                query.fetch(setState)
            }
        }, [relevantState, setState])
        return relevantState
    }) as Querise<State, Queries>

    // TODO: do we need some memo here?
    const Provider = (props: PropsWithChildren<Props>) => {
        const [state, setState] = React.useState(() => createInitialState(props))
        const actions = React.useMemo(() => createActions(setState), [setState])
        return (
            <ActionsContext.Provider value={[actions, queries]}>
                <StateContext.Provider value={state}>{props.children}</StateContext.Provider>
            </ActionsContext.Provider>
        )
    }
    Provider.displayName = name + " state provider"

    return {
        useState,
        useActions,
        Provider,
        queries: queryHooks,
    }
}

interface StatePrototype<State, Actions, Queries extends QueriesBase<State> | undefined> {
    initialState: State
    attached: (
        setState: SetState<State>,
    ) => {
        actions: Actions
        queries: Queries
    }
}

interface BareStatePrototype<State> extends StatePrototype<State, SetState<State>, undefined> {
    attach: <Actions, Queries extends QueriesBase<State>>(
        creator: (
            setState: SetState<State>,
        ) => {
            actions: Actions
            queries: Queries
        },
    ) => StatePrototype<State, Actions, Queries>
}

type QueriesBase<State> = Dict<((...args: any[]) => Query<State, unknown>) | Query<State, unknown>>

function initialState<State>(initialState: State): BareStatePrototype<State> {
    return {
        initialState,
        attached: s => ({ actions: s, queries: undefined }),
        attach: creator => ({
            initialState,
            attached: creator,
        }),
    }
}

// this is annoying because we can't share state to actions and queries e.g. a Howl or a client
// so maybe let's go back to the previous design (see usePlayerState)

// more thoughts on queries:
// 1. queries don't have to support fetching, they could just be a way to encapsulate selectors
// 2. queries need to be parametrisable [DONE]
// 3. aren't state and actions really just special queries?
// 4. even if unification is possible we may want two contexts
//    - one for actions+queries, which never change
//    - the other for underlying state, which often changes
