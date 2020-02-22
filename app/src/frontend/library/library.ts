import { makeState, Setter, Args } from "../state"
import { Dict } from "../util/types"
import { TrackSearchResult, DeezerApiClient } from "../../backend/deezer/gateway"
import { remote } from "../../backend/rpc/client"

export const Library = makeState((props: { backendUrl: string }) => {
    const client = remote<DeezerApiClient>(`${props.backendUrl}/deezer`)
    const initialState = {
        searchResultsByQuery: {} as Dict<TrackSearchResult[]>,
    }
    // TODO: this gets called after every call to set, it seems
    console.log("about to return the initial state plus the actions creator")
    return {
        initialState,
        actions: ({ get, set }: Args<typeof initialState>) => {
            // TODO: this gets called after every call to set, it seems
            console.log("got some state, making actions")
            return {
                search: async (query: string): Promise<TrackSearchResult[]> => {
                    if (query in get().searchResultsByQuery) {
                        return get().searchResultsByQuery[query]
                    } else {
                        const results = await client.searchTracks(query)
                        set(s => ({ searchResultsByQuery: { ...s.searchResultsByQuery, [query]: results } }))
                        return results
                    }
                },
            }
        },
    }
})
