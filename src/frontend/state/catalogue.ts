import { createSlice, Slice } from "@reduxjs/toolkit"
import { uniq } from "lodash"
import { Album, Artist, Playlist, SearchResultLists, Track } from "../../model"
import { filterMap } from "../../util/collections"
import { Dict } from "../../util/types"
import { curriedAsyncThunks } from "./reduxThunks"

interface CatalogueState {
    searchResultsByQuery: Dict<SearchResultLists>
    tracks: Dict<Track | string>
    albums: Dict<Album | string>
    artists: Dict<Artist | string>
    artistTopTracks: Dict<string[]>
    playlists: Dict<Playlist>
    discovery?: {
        topTracks: string[]
        newReleases: string[]
        playlistGroups: { name: string; playlists: string[] }[]
    }
    libraryLoaded: boolean
}

const initialState: CatalogueState = {
    searchResultsByQuery: {},
    tracks: {},
    albums: {},
    artists: {},
    artistTopTracks: {},
    playlists: {},
    libraryLoaded: false,
}

export const catalogueThunks = curriedAsyncThunks({
    getLibrary: api => api.extra.explorer.getLibrary,
    getAlbum: api => api.extra.explorer.getAlbum,
    getArtist: api => api.extra.explorer.getArtist,
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
        return api.extra.explorer.importItunesLibrary(fileContents)
    },
    fetchSearchResults: api => api.extra.explorer.searchTracks,
})

export const catalogueSlice: Slice<CatalogueState, Record<string, never>, "catalogue"> = createSlice({
    name: "catalogue",
    initialState,
    reducers: {},
    extraReducers: builder =>
        builder
            .addCase(
                catalogueThunks.getLibrary.fulfilled,
                (state, { payload }): CatalogueState =>
                    // TODO: should we be populating external ID pointers too?
                    ({
                        ...state,
                        ...payload,
                        /* hack */ discovery: {
                            newReleases: uniq(
                                Object.values(filterMap(payload.tracks, t => t.savedTimestamp && t.albumId)),
                            ),
                            topTracks: Object.keys(filterMap(payload.tracks, t => t.savedTimestamp)),
                            playlistGroups: [],
                        },
                        libraryLoaded: true,
                    }),
            )
            .addCase(catalogueThunks.getAlbum.fulfilled, (state, { payload: { album, tracks, artists } }) => {
                fillState(state, { tracks, albums: [album], artists })
            })
            .addCase(
                catalogueThunks.getArtist.fulfilled,
                (state, { payload: { artist, albums, topTracks } }) => {
                    fillState(state, { albums, tracks: topTracks, artists: [artist] })
                    state.artistTopTracks[artist.id] = topTracks.map(t => t.id)
                },
            )
            .addCase(
                catalogueThunks.addToLibrary.fulfilled,
                (state, { payload: { track, album, artists } }) => {
                    fillState(state, { tracks: [track], albums: album && [album], artists })
                },
            )
            .addCase(catalogueThunks.unsaveTrack.fulfilled, (state, { meta: { arg: trackId } }) => {
                const track = state.tracks[trackId]
                if (typeof track !== "object") throw new Error("unexpected")
                track.savedTimestamp = undefined
            })
            // TODO: optimistic update somehow. or maybe we can rely on the promise returned by dispatching the thunk?
            .addCase(catalogueThunks.setTrackRating.fulfilled, (state, { meta: { arg } }) => {
                const track = state.tracks[arg.trackId]
                if (typeof track !== "object") throw new Error("unexpected")
                track.rating = arg.newRating
            })
            .addCase(catalogueThunks.importItunesLibrary.fulfilled, (state, { payload }) => {
                fillState(state, payload.added)
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

export function resolveCanonical<T>(dict: Dict<T | string>, id: string | undefined): T | undefined {
    let r: string | T | undefined = id
    while (typeof r === "string") {
        // TODO: handle cycles
        r = dict[r]
    }
    return r
}

function fillState(
    state: CatalogueState,
    entities: { tracks?: Track[]; artists?: Artist[]; albums?: Album[]; playlists?: Playlist[] },
) {
    for (const track of entities.tracks ?? []) {
        for (const e of track.externalIds ?? []) state.tracks[e] = track.id
        state.tracks[track.id] = track
    }
    for (const album of entities.albums ?? []) {
        for (const e of album.externalIds ?? []) state.albums[e] = album.id
        state.albums[album.id] = album
    }
    for (const artist of entities.artists ?? []) {
        for (const e of artist.externalIds ?? []) state.artists[e] = artist.id
        state.artists[artist.id] = artist
    }
    for (const playlist of entities.playlists ?? []) {
        state.playlists[playlist.id] = playlist
    }
}
