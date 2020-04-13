import { Dict } from "../util/types"
import { TrackSearchResult, DeezerApiClient } from "../../backend/deezer/gateway"
import { remote } from "../../backend/rpc/client"
import { useState, useMemo } from "react"
import { createState, immerise } from "../state"

function useLibraryState(props: { backendUrl: string }) {
    const client = useMemo(() => remote<DeezerApiClient>(`${props.backendUrl}/deezer`), [props.backendUrl])

    const [state, setState] = useState({
        searchResultsByQuery: {} as Dict<TrackSearchResult[]>,
        tracks: {} as Dict<{ title: string }>,
        libraryTrackIds: null as string[] | null,
    })
    const update = immerise(setState)

    const actions = {
        search: async (query: string): Promise<TrackSearchResult[]> => {
            if (query in state.searchResultsByQuery) {
                return state.searchResultsByQuery[query]!
            } else {
                const results = await client.searchTracks(query)
                update(s => void (s.searchResultsByQuery[query] = results))
                return results
            }
        },
        update,
    }

    return [state, actions] as const
}

export const Library = createState(useLibraryState)
