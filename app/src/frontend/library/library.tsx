import { Dict } from "../util/types"
import { TrackSearchResult, DeezerApiClient } from "../../backend/deezer/gateway"
import { remote } from "../../backend/rpc/client"
import { useState, useMemo, useEffect } from "react"
import { createState, immerise } from "../state"

interface Track {
    title: string
    albumId: string
    artistId: string
}

interface Album {
    title: string
    coverImageUrl: string
}

interface Artist {
    name: string
}

const library = createState((props: { backendUrl: string }) => {
    const client = useMemo(() => remote<DeezerApiClient>(`${props.backendUrl}/deezer`), [props.backendUrl])

    const [state, setState] = useState({
        searchResultsByQuery: {} as Dict<TrackSearchResult[]>,
        tracks: {} as Dict<Track>,
        albums: {} as Dict<Album>,
        artists: {} as Dict<Artist>,
        libraryTrackIds: null as string[] | null,
    })
    const update = immerise(setState)

    return [state, { update, client }]
})

export const useLibraryState = library.useState
export const useLibraryDispatch = library.useDispatch
export const LibraryProvider = library.Provider

export const useLibrarySearch = (query: string | null): TrackSearchResult[] => {
    const { client, update } = useLibraryDispatch()
    const searchResults = useLibraryState(s => query && s.searchResultsByQuery[query])
    useEffect(() => {
        async function fetchSearchResults() {
            if (searchResults === undefined && query !== null) {
                console.log(`searching for ${query}`)
                const results = await client.searchTracks(query)
                console.log(`${results.length} results`)
                update(s => {
                    // TODO turn list of search results by query into a list of track/artist/album IDs
                    s.searchResultsByQuery[query] = results
                    for (const result of results) {
                        console.log("adding a result to the state")
                        s.tracks[result.track.externalId] = {
                            title: result.track.title,
                            albumId: result.album.externalId,
                            artistId: result.artist.externalId,
                        }
                        s.albums[result.album.externalId] = {
                            title: result.album.title,
                            coverImageUrl: result.album.coverImageUrl,
                        }
                        s.artists[result.artist.externalId] = {
                            name: result.artist.name,
                        }
                    }
                    console.log("new state has " + JSON.stringify({ tracks: s.tracks }))
                })
            }
        }
        fetchSearchResults()
    }, [client, query, searchResults, update])

    return searchResults || []
}
