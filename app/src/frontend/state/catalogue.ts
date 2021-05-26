import { createSlice, Slice } from "@reduxjs/toolkit"
import { Album, Artist, Playlist, SearchResultLists, Track } from "../../model"
import { Dict } from "../../util/types"
import { curriedAsyncThunks } from "./reduxThunks"

interface CatalogueState {
    searchResultsByQuery: Dict<SearchResultLists>
    tracks: Dict<Track | string>
    albums: Dict<Album | string>
    artists: Dict<Artist | string>
    playlists: Dict<Playlist>
}

const initialState: CatalogueState = {
    searchResultsByQuery: {},
    tracks: {},
    albums: {},
    artists: {},
    playlists: {},
}

export const catalogueThunks = curriedAsyncThunks({
    getLibrary: api => api.extra.explorer.getLibrary,
    addToLibrary: api => api.extra.explorer.addTrack,
    unsaveTrack: api => api.extra.explorer.unsave,
    setTrackRating: api => api.extra.explorer.setTrackRating,
    importItunesLibrary: api => async (file: File) => {
        const fileReader = new FileReader()
        const fileContents = await new Promise<string>((resolve, reject) => {
            fileReader.addEventListener("error", () => reject(fileReader.error))
            fileReader.addEventListener("load", () => resolve(fileReader.result as string))
            fileReader.readAsText(file)
        })
        return await api.extra.explorer.importItunesLibrary(fileContents)
    },
    fetchSearchResults: api => api.extra.explorer.searchTracks,
})

export const catalogueSlice: Slice<CatalogueState, Record<string, never>, "catalogue"> = createSlice({
    name: "catalogue",
    initialState,
    reducers: {},
    extraReducers: builder =>
        builder
            .addCase(catalogueThunks.getLibrary.fulfilled, (state, { payload }) => {
                // TODO: should we be populating external ID pointers too?
                return { ...state, ...payload }
            })
            .addCase(
                catalogueThunks.addToLibrary.fulfilled,
                (state, { payload: { track, album, artist } }) => {
                    state.tracks[track.catalogueId] = track
                    state.tracks[track.externalId] = track.catalogueId
                    state.albums[album.catalogueId] = album
                    state.albums[album.externalId] = album.catalogueId
                    state.artists[artist.catalogueId] = artist
                    state.artists[artist.externalId] = artist.catalogueId
                },
            )
            .addCase(catalogueThunks.unsaveTrack.fulfilled, (state, { meta: { arg: trackId } }) => {
                const track = state.tracks[trackId]
                if (typeof track !== "object") throw new Error("unexpected")
                track.savedTimestamp = null
            })
            // TODO: optimistic update somehow. or maybe we can rely on the promise returned by dispatching the thunk?
            .addCase(catalogueThunks.setTrackRating.fulfilled, (state, { meta: { arg } }) => {
                const track = state.tracks[arg.trackId]
                if (typeof track !== "object") throw new Error("unexpected")
                track.rating = arg.newRating
            })
            .addCase(catalogueThunks.importItunesLibrary.fulfilled, (state, { payload }) => {
                for (const track of payload.added.tracks) state.tracks[track.catalogueId] = track
                for (const album of payload.added.albums) state.albums[album.catalogueId] = album
                for (const artist of payload.added.artists) state.artists[artist.catalogueId] = artist
            })
            .addCase(catalogueThunks.fetchSearchResults.fulfilled, (state, { meta, payload }) => {
                const query = meta.arg
                state.searchResultsByQuery[query] = payload.results
                // TODO: use some sort of version number to detect old versions
                state.tracks = { ...state.tracks, ...payload.tracks }
                state.albums = { ...state.albums, ...payload.albums }
                state.artists = { ...state.artists, ...payload.artists }
            }),
})

export function resolveCanonical<T>(dict: Dict<T | string>, id: string): T {
    let r: string | T = id
    while (typeof r === "string") {
        // TODO: handle cycles
        const next: string | undefined | T = dict[r]
        if (next === undefined) {
            throw new Error(`${r} not found when resolving id ${id}`)
        }
        r = next
    }
    return r
}
