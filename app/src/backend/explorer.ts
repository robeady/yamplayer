import { forEach, keyBy } from "lodash"
import {
    Album,
    Artist,
    CataloguedAlbum,
    CataloguedArtist,
    CataloguedTrack,
    MatchedSearchResults,
    Playlist,
    Track,
} from "../model"
import { Service, TrackResolver } from "../services"
import { parseItunesLibraryXml } from "../services/apple/itunes"
import { Dict, Int } from "../util/types"
import { LibraryStore } from "./library"
import { matchItunesLibrary } from "./matching"

export interface LibraryContents {
    tracks: Dict<CataloguedTrack>
    albums: Dict<CataloguedAlbum>
    artists: Dict<CataloguedArtist>
}

export interface AlbumEtc {
    album: Album
    tracks: Track[]
    artists: Artist[]
}

export class Explorer {
    constructor(private library: LibraryStore, private service: Service, private resolver: TrackResolver) {}

    static async seeded(
        library: LibraryStore,
        service: Service,
        resolver: TrackResolver,
        externalTrackIds: string[],
    ): Promise<Explorer> {
        await library.clear()

        const explorer = new Explorer(library, service, resolver)

        const externalTracks = await Promise.all(
            externalTrackIds.map(async tid => explorer.service.lookupTrack(tid)),
        )
        const externalAlbumIds = new Set(externalTracks.map(t => t.albumId))
        const externalArtistIds = new Set(externalTracks.flatMap(t => t.artistIds))
        const externalAlbums = await Promise.all(
            [...externalAlbumIds].map(async aid => explorer.service.lookupAlbum(aid)),
        )
        const externalArtists = await Promise.all(
            [...externalArtistIds].map(async aid => explorer.service.lookupArtist(aid)),
        )

        const addedArtists = await Promise.all(externalArtists.map(async a => explorer.library.addArtist(a)))
        const artistIdsByExternalId = Object.fromEntries(addedArtists.map(a => [a.externalId, a.catalogueId]))
        const addedAlbums = await Promise.all(
            externalAlbums.map(async a =>
                explorer.library.addAlbum({ ...a, artistId: artistIdsByExternalId[a.artistId]! }),
            ),
        )
        const albumIdsByExternalId = Object.fromEntries(addedAlbums.map(a => [a.externalId, a.catalogueId]))
        await Promise.all(
            externalTracks.map(async t =>
                explorer.library.addTrack({
                    ...t,
                    albumId: albumIdsByExternalId[t.albumId]!,
                    artistIds: t.artistIds.map(a => artistIdsByExternalId[a]!),
                }),
            ),
        )

        return explorer
    }

    async resolveTrackUrl(trackId: string): Promise<string> {
        return this.resolver.resolveTrackUrl(trackId)
    }

    async getLibrary(): Promise<LibraryContents> {
        return this.library.list({ trackSaved: true })
    }

    /** Fetches an album and associated tracks and artists. Includes tracks not in the library. */
    async getAlbum(albumId: string): Promise<AlbumEtc> {
        if (albumId.includes(":")) {
            const external = await this.service.lookupAlbumEtc(albumId)
            const [internalAlbum] = await this.library.matchAlbums([albumId])
            const internalArtists = keyBy(
                await this.library.matchArtists(external.artists.map(a => a.externalId)),
                a => a.externalId,
            )
            const internalTracks = keyBy(
                await this.library.matchTracks(external.tracks.map(t => t.externalId)),
                t => t.externalId,
            )
            return {
                album: {
                    ...external.album,
                    catalogueId: internalAlbum?.catalogueId ?? null,
                    cataloguedTimestamp: internalAlbum?.cataloguedTimestamp ?? null,
                },
                tracks: external.tracks.map(t => ({
                    ...t,
                    ...internalTracks[t.externalId],
                    // ugh, we need explicit nulls for these if there was no internal track that matched
                    catalogueId: internalTracks[t.externalId]?.catalogueId ?? null,
                    cataloguedTimestamp: internalTracks[t.externalId]?.cataloguedTimestamp ?? null,
                    savedTimestamp: internalTracks[t.externalId]?.savedTimestamp ?? null,
                })),
                artists: external.artists.map(a => ({
                    ...a,
                    catalogueId: internalArtists[a.externalId]?.catalogueId ?? null,
                    cataloguedTimestamp: internalArtists[a.externalId]?.cataloguedTimestamp ?? null,
                })),
            }
        } else {
            const internal = await this.library.list({ albumId })
            // there might be more tracks in the album not in our library
            const tracks = Object.values(internal.tracks)
            const album = Object.values(internal.albums)[0]!
            if (album.numTracks === tracks.length) {
                return { album, artists: Object.values(internal.artists), tracks }
            } else {
                const external = await this.service.lookupAlbumEtc(album.externalId)
                // we don't update the internal tracks with external information here. could this lead to weird inconsistencies?
                const combinedTracks: Track[] = [
                    ...tracks,
                    ...external.tracks
                        .filter(et => !tracks.some(it => it.externalId === et.externalId))
                        .map(et => ({
                            ...et,
                            catalogueId: null,
                            cataloguedTimestamp: null,
                            savedTimestamp: null,
                        })),
                ]
                return { album, tracks: combinedTracks, artists: Object.values(internal.artists) }
            }
        }
    }

    async searchTracks(query: string): Promise<MatchedSearchResults> {
        const searchResponse = await this.service.searchTracks(query)
        const [matchedTracks, matchedAlbums, matchedArtists] = await Promise.all([
            this.library.matchTracks(Object.keys(searchResponse.tracks)),
            this.library.matchAlbums(Object.keys(searchResponse.albums)),
            this.library.matchArtists(Object.keys(searchResponse.artists)),
        ])

        const tracks: Dict<Track | string> = {}
        forEach(searchResponse.tracks, (track, id) => {
            tracks[id] = { ...track, catalogueId: null, cataloguedTimestamp: null, savedTimestamp: null }
        })
        const albums: Dict<Album | string> = {}
        forEach(searchResponse.albums, (album, id) => {
            albums[id] = { ...album, catalogueId: null, cataloguedTimestamp: null }
        })
        const artists: Dict<Artist | string> = {}
        forEach(searchResponse.artists, (artist, id) => {
            artists[id] = { ...artist, catalogueId: null, cataloguedTimestamp: null }
        })
        for (const t of matchedTracks) {
            tracks[t.externalId] = t.catalogueId
            tracks[t.catalogueId] = t
        }
        for (const a of matchedAlbums) {
            albums[a.externalId] = a.catalogueId
            albums[a.catalogueId] = a
        }
        for (const a of matchedArtists) {
            artists[a.externalId] = a.catalogueId
            artists[a.catalogueId] = a
        }

        return { results: searchResponse.results, tracks, albums, artists }
    }

    async unsave(trackId: string): Promise<void> {
        return this.library.unsave(trackId)
    }

    async setTrackRating(arg: { trackId: string; newRating: number | null }): Promise<void> {
        return this.library.setRating(arg.trackId, arg.newRating)
    }

    async addTrack(
        externalTrackId: string,
    ): Promise<{ track: CataloguedTrack; album: CataloguedAlbum; artists: CataloguedArtist[] }> {
        const externalTrack = await this.service.lookupTrack(externalTrackId)
        // TODO: maybe the service can return artist & album information in that call
        const [matchingTrack = undefined] = await this.library.matchTracks([externalTrack.externalId])
        if (matchingTrack === undefined) {
            const [album, artists] = await Promise.all([
                this.addAlbumForTrack(externalTrack.albumId),
                this.addArtistsForTrack(externalTrack.artistIds),
            ])
            const track = await this.library.addTrack({
                ...externalTrack,
                albumId: album.catalogueId,
                artistIds: artists.map(a => a.catalogueId),
            })
            return { track, album, artists }
        } else {
            // already in library, just ensure it's marked as saved
            const [, artists, album] = await Promise.all([
                this.library.save(matchingTrack.catalogueId),
                this.library.getArtists(matchingTrack.artistIds),
                this.library.getAlbum(matchingTrack.albumId),
            ])
            return { track: matchingTrack, album, artists }
        }
    }

    private async addAlbumForTrack(externalAlbumId: string) {
        const [matchingAlbum = undefined] = await this.library.matchAlbums([externalAlbumId])
        if (matchingAlbum === undefined) {
            const externalAlbum = await this.service.lookupAlbum(externalAlbumId)
            return this.library.addAlbum(externalAlbum)
        } else {
            return matchingAlbum
        }
    }

    /** Returns an array of artists, one per external artist ID, in the same order as the input */
    private async addArtistsForTrack(externalArtistIds: string[]): Promise<CataloguedArtist[]> {
        const matchingArtists = await this.library.matchArtists(externalArtistIds)
        return Promise.all(
            externalArtistIds.map(externalId => {
                const match = matchingArtists.find(m => m.externalId === externalId)
                if (match === undefined) {
                    return this.service
                        .lookupArtist(externalId)
                        .then(async externalArtist => this.library.addArtist(externalArtist))
                } else {
                    return match
                }
            }),
        )
    }

    async importItunesLibrary(itunesLibraryXml: string): Promise<ImportItunesResult> {
        const itunesLibraryContents = parseItunesLibraryXml(itunesLibraryXml)

        const matchedTracksByExternalId = await matchItunesLibrary(itunesLibraryContents, this.service)

        const matchedExternalIds = [...Object.keys(matchedTracksByExternalId)]

        for (const track of await this.library.matchTracks(matchedExternalIds)) {
            // TODO: could we update metadata and stuff? rating? added timestamp?
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete matchedTracksByExternalId[track.externalId]
        }
        // now externalTrackIds only contains IDs of new tracks to catalogue

        const externalTracks = await Promise.all(
            matchedExternalIds.map(async tid => this.service.lookupTrack(tid)),
        )

        const externalAlbumIds = new Set(externalTracks.map(t => t.albumId))
        const externalArtistIds = new Set(externalTracks.flatMap(t => t.artistIds))

        const albumIdsByExternalId = new Map<string, string>()
        const artistIdsByExternalId = new Map<string, string>()

        for (const album of await this.library.matchAlbums([...externalAlbumIds])) {
            externalAlbumIds.delete(album.externalId)
            albumIdsByExternalId.set(album.externalId, album.catalogueId)
        }
        for (const artist of await this.library.matchArtists([...externalArtistIds])) {
            externalArtistIds.delete(artist.externalId)
            artistIdsByExternalId.set(artist.externalId, artist.catalogueId)
        }

        // now external album and artist IDs also only contain what's new and needs cataloguing

        const externalAlbums = await Promise.all(
            [...externalAlbumIds].map(async id => this.service.lookupAlbum(id)),
        )
        const externalArtists = await Promise.all(
            [...externalArtistIds].map(async id => this.service.lookupArtist(id)),
        )

        // TODO batch-add functions
        const addedAlbums = await Promise.all(externalAlbums.map(async a => this.library.addAlbum(a)))
        for (const album of addedAlbums) {
            albumIdsByExternalId.set(album.externalId, album.catalogueId)
        }
        const addedArtists = await Promise.all(externalArtists.map(async a => this.library.addArtist(a)))
        for (const artist of addedArtists) {
            artistIdsByExternalId.set(artist.externalId, artist.catalogueId)
        }

        const addedPlaylists = await Promise.all(
            itunesLibraryContents.playlists.map(async p => this.library.addPlaylist(p)),
        )

        const addedTracks = await Promise.all(
            externalTracks.map(async t =>
                this.library.addTrack({
                    ...t,
                    rating: matchedTracksByExternalId[t.externalId]!.itunesTrack.rating ?? null,
                    albumId: albumIdsByExternalId.get(t.albumId)!,
                    artistIds: t.artistIds.map(a => artistIdsByExternalId.get(a)!),
                }),
            ),
        )

        return {
            stats: {
                numTracksInItunes: itunesLibraryContents.tracks.length,
                numNewTracksCatalogued: externalTracks.length,
                numNewAlbumsCatalogued: externalAlbums.length,
                numNewArtistsCatalogued: externalArtists.length,
            },
            added: {
                tracks: addedTracks,
                albums: addedAlbums,
                artists: addedArtists,
                playlists: addedPlaylists,
            },
        }
    }
}

export interface ImportItunesResult {
    stats: {
        numTracksInItunes: Int
        numNewTracksCatalogued: Int
        numNewAlbumsCatalogued: Int
        numNewArtistsCatalogued: Int
    }
    added: {
        tracks: CataloguedTrack[]
        albums: CataloguedAlbum[]
        artists: CataloguedArtist[]
        playlists: Playlist[]
    }
}
