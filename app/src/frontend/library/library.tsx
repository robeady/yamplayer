import { Dict } from "../../util/types"
import { remote } from "../../backend/rpc/client"
import { useEffect, useMemo, useState } from "react"
import { createState, immerise } from "../state"
import { Album, Artist, SearchResultLists, Track } from "../../model"
import { Explorer } from "../../backend/explorer"

interface ExplorerState {
    searchResultsByQuery: Dict<SearchResultLists>
    tracks: Dict<Track | string>
    albums: Dict<Album | string>
    artists: Dict<Artist | string>
}

export const { Provider: ExplorerProvider, useState: useExplorerState, useDispatch: useExplorerDispatch } = createState(
    (props: { backendUrl: string }) => {
        const [state, setState] = useState<ExplorerState>({
            searchResultsByQuery: {},
            tracks: {},
            albums: {},
            artists: {},
        })
        const dispatch = useMemo(() => {
            const update = immerise(setState)
            const explorerClient = remote<Explorer>(`${props.backendUrl}/explorer`)

            const addToLibrary = async (externalTrackId: string) => {
                const { track, album, artist } = await explorerClient.addTrack(externalTrackId)
                update(s => {
                    s.tracks[track.libraryId] = track
                    s.tracks[track.externalId] = track.libraryId
                    s.albums[album.libraryId] = album
                    s.albums[album.externalId] = album.libraryId
                    s.artists[artist.libraryId] = artist
                    s.artists[artist.externalId] = artist.libraryId
                })
            }

            const unsave = async (trackId: string) => {
                await explorerClient.unsave(trackId)
                update(s => {
                    const track = s.tracks[trackId]
                    if (typeof track !== "string") {
                        track.saved = false
                    }
                })
            }

            return { update, addToLibrary, unsave, explorerClient }
        }, [props.backendUrl])

        return [state, dispatch]
    },
)

export function resolveCanonical<T>(dict: Dict<T | string>, id: string): T {
    let r: string | T = id
    while (typeof r === "string") {
        // TODO: handle cycles
        r = dict[r]
    }
    return r
}

export const useSearchResults = (query: string | null): SearchResultLists => {
    const { explorerClient, update } = useExplorerDispatch()
    const searchResults = useExplorerState(s => query && s.searchResultsByQuery[query])
    useEffect(() => {
        async function fetchSearchResults() {
            if (searchResults === undefined && query !== null && query !== "") {
                console.log(`searching for ${query}`)
                const r = await explorerClient.searchTracks(query)
                update(s => {
                    s.searchResultsByQuery[query] = r.results
                    // TODO: use some sort of version number to detect old versions
                    s.tracks = { ...s.tracks, ...r.tracks }
                    s.albums = { ...s.albums, ...r.albums }
                    s.artists = { ...s.artists, ...r.artists }
                })
            }
        }
        fetchSearchResults()
    }, [explorerClient, query, searchResults, update])

    return searchResults || { externalTrackIds: [], externalAlbumIds: [], externalArtistIds: [] }
}
