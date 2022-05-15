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
import { isExternalId } from "../services/ids"
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
        const artistIdsByExternalId = Object.fromEntries(
            addedArtists.flatMap(a => a.externalIds.map(e => [e, a.id])),
        )
        const addedAlbums = await Promise.all(
            externalAlbums.map(async a =>
                explorer.library.addAlbum({ ...a, artistId: artistIdsByExternalId[a.artistId]! }),
            ),
        )
        const albumIdsByExternalId = Object.fromEntries(
            addedAlbums.map(a => a.externalIds.flatMap(e => [e, a.id])),
        )
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
        // TODO: this logic got hideously complicated.
        // maybe it would be better to let the UI query for any artists it doesn't know about instead?

        if (isExternalId(albumId)) {
            const external = await this.service.lookupAlbumAndTracks(albumId)
            const [internalAlbum] = await this.library.matchAlbums([albumId])
            const [internalArtist] = await this.library.matchArtists([external.album.artistId])

            const internalTracks = await this.library.matchTracks(external.tracks.map(t => t.id))
            const internalTracksByExternalId = Object.fromEntries(
                internalTracks.flatMap(t => t.externalIds.map(e => [e, t])),
            )

            // some artists may already appear in the internal data. others should be matched
            // this is basically copy pasted from below.
            const allExternalArtistIds = [...new Set(external.tracks.flatMap(t => t.artistIds))]
            const artistsToMatch = allExternalArtistIds.filter(e => internalArtist!.externalIds.includes(e))
            const matchedArtists = await this.library.matchArtists(artistsToMatch)
            const remainingExternalArtistIds = [...allExternalArtistIds].filter(
                e =>
                    // we tried to match this external artist
                    artistsToMatch.includes(e) &&
                    // and we failed
                    !matchedArtists.some(m => m.externalIds.includes(e)),
            )

            const lookedUpExternalArtists = await Promise.all(
                remainingExternalArtistIds.map(async a => this.service.lookupArtist(a)),
            )

            return {
                album: {
                    ...external.album,
                    id: internalAlbum?.id ?? external.album.id,
                    cataloguedTimestamp: internalAlbum?.cataloguedTimestamp,
                },
                tracks: external.tracks.map(t => ({
                    ...t,
                    ...internalTracksByExternalId[t.id],
                })),
                artists: [...(internalArtist ? [internalArtist] : []), ...lookedUpExternalArtists],
            }
        } else {
            const internal = await this.library.list({ albumId })
            // TODO: handle not found
            // there might be more tracks in the album not in our library
            const tracks = Object.values(internal.tracks)
            const artists = Object.values(internal.artists)
            const album = Object.values(internal.albums)[0]!
            if (album.numTracks === tracks.length) {
                return { album, artists, tracks }
            } else {
                // _HandleMultipleServices_
                const external = await this.service.lookupAlbumAndTracks(album.externalIds[0]!)
                // we don't update the internal tracks with external information here. could this lead to weird inconsistencies?

                // some artists may already appear in the internal data. others should be matched
                const allExternalArtistIds = new Set(external.tracks.flatMap(t => t.artistIds))
                const artistsToMatch = new Set<string>()
                for (const externalArtistId of allExternalArtistIds) {
                    const already = artists.find(a => a.externalIds.includes(externalArtistId))
                    if (already === undefined) {
                        artistsToMatch.add(externalArtistId)
                    }
                }
                const matchedArtists = await this.library.matchArtists([...artistsToMatch])
                const remainingExternalArtistIds = [...allExternalArtistIds].filter(
                    e =>
                        // we tried to match this external artist
                        artistsToMatch.has(e) &&
                        // and we failed
                        !matchedArtists.some(m => m.externalIds.includes(e)),
                )

                const lookedUpExternalArtists = await Promise.all(
                    remainingExternalArtistIds.map(async a => this.service.lookupArtist(a)),
                )

                const combinedTracks: Track[] = [
                    ...tracks,
                    ...external.tracks
                        .filter(et => !tracks.some(it => it.externalIds.includes(et.id)))
                        .map(et => ({
                            ...et,
                            // remap external track artist IDs
                            artistIds: et.artistIds.map(
                                externalArtistId =>
                                    artists.find(a => a.externalIds.includes(externalArtistId))?.id ??
                                    matchedArtists.find(m => m.externalIds.includes(externalArtistId))?.id ??
                                    externalArtistId,
                            ),
                        })),
                ]

                return {
                    album,
                    tracks: combinedTracks,
                    artists: [...artists, ...matchedArtists, ...lookedUpExternalArtists],
                }
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

        const { tracks, albums, artists } = searchResponse as MatchedSearchResults

        for (const t of matchedTracks) {
            for (const id of t.externalIds) tracks[id] = t.id
            tracks[t.id] = t
        }
        for (const a of matchedAlbums) {
            for (const id of a.externalIds) albums[id] = a.id
            albums[a.id] = a
        }
        for (const a of matchedArtists) {
            for (const id of a.externalIds) artists[id] = a.id
            artists[a.id] = a
        }

        return { results: searchResponse.results, tracks, albums, artists }
    }

    async unsave(trackId: string): Promise<void> {
        return this.library.unsave(trackId)
    }

    async setTrackRating(arg: { trackId: string; newRating: number | undefined }): Promise<void> {
        return this.library.setRating(arg.trackId, arg.newRating)
    }

    async addTrack(
        externalTrackId: string,
    ): Promise<{ track: CataloguedTrack; album?: CataloguedAlbum; artists?: CataloguedArtist[] }> {
        const externalTrack = await this.service.lookupTrack(externalTrackId)
        // TODO: maybe the service can return artist & album information in that call
        const [matchingTrack = undefined] = await this.library.matchTracks([externalTrack.id])
        if (matchingTrack === undefined) {
            const artists = await this.addArtistsForTrack(externalTrack.artistIds)
            const album = await this.addAlbumForTrack(externalTrack.albumId)
            const track = await this.library.addTrack({
                ...externalTrack,
                albumId: album.id,
                artistIds: artists.map(a => a.id),
            })
            return { track, album, artists }
        } else {
            // already in library, just ensure it's marked as saved
            await this.library.save(matchingTrack.id)
            return { track: matchingTrack }
        }
    }

    private async addAlbumForTrack(externalAlbumId: string) {
        const [matchingAlbum = undefined] = await this.library.matchAlbums([externalAlbumId])
        if (matchingAlbum === undefined) {
            // TODO: maybe we can get artist information in this call
            const externalAlbum = await this.service.lookupAlbum(externalAlbumId)
            const [matchingArtist = undefined] = await this.library.matchArtists([externalAlbum.artistId])
            const artist =
                matchingArtist === undefined
                    ? await this.service
                          .lookupArtist(externalAlbum.artistId)
                          .then(async externalArtist => this.library.addArtist(externalArtist))
                    : matchingArtist
            return this.library.addAlbum({ ...externalAlbum, artistId: artist.id })
        } else {
            return matchingAlbum
        }
    }

    /** Returns an array of artists, one per external artist ID, in the same order as the input */
    private async addArtistsForTrack(externalArtistIds: string[]): Promise<CataloguedArtist[]> {
        const matchingArtists = await this.library.matchArtists(externalArtistIds)
        return Promise.all(
            externalArtistIds.map(externalId => {
                const match = matchingArtists.find(m => m.externalIds.includes(externalId))
                return (
                    match ??
                    this.service
                        .lookupArtist(externalId)
                        .then(async externalArtist => this.library.addArtist(externalArtist))
                )
            }),
        )
    }

    async importItunesLibrary(itunesLibraryXml: string): Promise<ImportItunesResult> {
        const itunesLibraryContents = parseItunesLibraryXml(itunesLibraryXml)

        const matchedTracksByExternalId = await matchItunesLibrary(itunesLibraryContents, this.service)

        const matchedExternalIds = [...Object.keys(matchedTracksByExternalId)]

        for (const track of await this.library.matchTracks(matchedExternalIds)) {
            // TODO: could we update metadata and stuff? rating? added timestamp?
            for (const e of track.externalIds) delete matchedTracksByExternalId[e]
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
            for (const e of album.externalIds) {
                externalAlbumIds.delete(e)
                albumIdsByExternalId.set(e, album.id)
            }
        }
        for (const artist of await this.library.matchArtists([...externalArtistIds])) {
            for (const e of artist.externalIds) {
                externalArtistIds.delete(e)
                artistIdsByExternalId.set(e, artist.id)
            }
        }

        // now external album and artist IDs also only contain what's new and needs cataloguing

        const externalAlbums = await Promise.all(
            [...externalAlbumIds].map(async id => this.service.lookupAlbum(id)),
        )
        const externalArtists = await Promise.all(
            [...externalArtistIds].map(async id => this.service.lookupArtist(id)),
        )

        // TODO batch-add functions
        const addedArtists = await Promise.all(externalArtists.map(async a => this.library.addArtist(a)))
        for (const artist of addedArtists) {
            for (const e of artist.externalIds) {
                artistIdsByExternalId.set(e, artist.id)
            }
        }

        const addedAlbums = await Promise.all(
            externalAlbums.map(async a =>
                this.library.addAlbum({ ...a, artistId: artistIdsByExternalId.get(a.artistId)! }),
            ),
        )
        for (const album of addedAlbums) {
            for (const e of album.externalIds) {
                albumIdsByExternalId.set(e, album.id)
            }
        }

        const addedPlaylists = await Promise.all(
            itunesLibraryContents.playlists.map(async p => this.library.addPlaylist(p)),
        )

        const addedTracks = await Promise.all(
            externalTracks.map(async t =>
                this.library.addTrack({
                    ...t,
                    rating: matchedTracksByExternalId[t.id]!.itunesTrack.rating,
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
