import { useEffect, useMemo, useState } from "react"
import { Explorer } from "../../backend/explorer"
import { remote } from "../../backend/rpc/client"
import { Album, Artist, SearchResultLists, Track } from "../../model"
import { Dict } from "../../util/types"
import { createState, immerise } from "../state"

interface ExplorerState {
    searchResultsByQuery: Dict<SearchResultLists>
    tracks: Dict<Track | string>
    albums: Dict<Album | string>
    artists: Dict<Artist | string>
}

export const {
    Provider: ExplorerProvider,
    useState: useExplorerState,
    useDispatch: useExplorerDispatch,
} = createState((props: { backendUrl: string }) => {
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
                s.tracks[track.catalogueId] = track
                s.tracks[track.externalId] = track.catalogueId
                s.albums[album.catalogueId] = album
                s.albums[album.externalId] = album.catalogueId
                s.artists[artist.catalogueId] = artist
                s.artists[artist.externalId] = artist.catalogueId
            })
        }

        const unsave = async (trackId: string) => {
            await explorerClient.unsave(trackId)
            update(s => {
                const track = s.tracks[trackId]
                if (typeof track !== "string") {
                    track.savedTimestamp = null
                }
            })
        }

        const setTrackRating = async (trackId: string, newRating: number | null) => {
            console.log(`setting rating of track ${trackId} to ${newRating}`)
            await explorerClient.setTrackRating(trackId, newRating)
            update(s => {
                const track = s.tracks[trackId]
                if (typeof track !== "string") {
                    track.rating = newRating
                }
            })
        }

        async function importItunesLibrary(file: File) {
            const fileReader = new FileReader()
            const fileContents = await new Promise<string>((resolve, reject) => {
                fileReader.onerror = () => reject(fileReader.error)
                fileReader.onload = () => resolve(fileReader.result as string)
                fileReader.readAsText(file)
            })
            const result = await explorerClient.importItunesLibrary(fileContents)
            update(s => {
                for (const track of result.added.tracks) s.tracks[track.catalogueId] = track
                for (const album of result.added.albums) s.albums[album.catalogueId] = album
                for (const artist of result.added.artists) s.artists[artist.catalogueId] = artist
                // _NoItunesPlaylistsYet_ also add playlists when we import them
            })
            return result.stats
        }

        return { update, addToLibrary, unsave, setTrackRating, importItunesLibrary, explorerClient }
    }, [props.backendUrl])

    useEffect(() => {
        dispatch.explorerClient.getLibrary().then(r => {
            console.log(JSON.stringify(r))
            // TODO: should we be populating external ID pointers too?
            setState(s => ({ ...s, ...r }))
        })
    }, [dispatch])

    return [state, dispatch]
})

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
