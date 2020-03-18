import { Dict } from "../util/types"
import { TrackSearchResult, DeezerApiClient } from "../../backend/deezer/gateway"
import { remote } from "../../backend/rpc/client"
import { useState, useMemo, ReactType } from "react"
import { createState } from "../state"

interface Query<T> {
    data: T
}

function useLibraryState(props: { backendUrl: string }) {
    const client = useMemo(() => remote<DeezerApiClient>(`${props.backendUrl}/deezer`), [props.backendUrl])
    const [state, setState] = useState({
        searchResultsByQuery: {} as Dict<TrackSearchResult[]>,
        tracks: {} as Dict<{ title: string }>,
        libraryTrackIds: null as string[] | null,
    })

    // a query
    const getLibraryTracks = () => ({
        data: state.libraryTrackIds === null ? null : state.tracks /* TODO: filter by in library */,
        fetch: () =>
            client
                .searchTracks("todo actual query")
                .then(() => setState(s => ({ ...s, libraryTrackIds: ["id1"], tracks: { id1: { title: "song 1" } } }))),
    })

    const actions = {
        search: async (query: string): Promise<TrackSearchResult[]> => {
            if (query in state.searchResultsByQuery) {
                return state.searchResultsByQuery[query]
            } else {
                const results = await client.searchTracks(query)
                setState(s => ({ ...s, searchResultsByQuery: { ...s.searchResultsByQuery, [query]: results } }))
                return results
            }
        },
    }

    const queries = {
        useLibraryTracks: {
            select: (s: typeof state) => s.libraryTrackIds,
            fetch: (set: typeof setState) =>
                client.searchTracks("todo actual query").then(() => set(s => ({ ...s, libraryTrackIds: [] }))),
        },
    }

    return [state, actions] as const
}

export const Library = createState(useLibraryState)

//
//
//
// what's a better API around queries?
// how about you write
// const [trackIdsInLibrary, ...] = Library.queries.useTrackIds()
