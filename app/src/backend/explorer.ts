import { forEach } from "lodash"
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
import { ItunesTrack, parseItunesLibraryXml } from "../services/apple/itunes"
import { Dict, Int } from "../util/types"
import { LibraryStore } from "./library"

export interface LibraryContents {
    tracks: Dict<CataloguedTrack>
    albums: Dict<CataloguedAlbum>
    artists: Dict<CataloguedArtist>
    playlists: Dict<Playlist>
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
        const externalArtistIds = new Set(externalTracks.map(t => t.artistId))
        const externalAlbums = await Promise.all(
            [...externalAlbumIds].map(async aid => explorer.service.lookupAlbum(aid)),
        )
        const externalArtists = await Promise.all(
            [...externalArtistIds].map(async aid => explorer.service.lookupArtist(aid)),
        )

        const addedArtists = await Promise.all(externalArtists.map(async a => explorer.library.addArtist(a)))
        const addedAlbums = await Promise.all(externalAlbums.map(async a => explorer.library.addAlbum(a)))
        const artistIdsByExternalId = Object.fromEntries(addedArtists.map(a => [a.externalId, a.catalogueId]))
        const albumIdsByExternalId = Object.fromEntries(addedAlbums.map(a => [a.externalId, a.catalogueId]))
        await Promise.all(
            externalTracks.map(async t =>
                explorer.library.addTrack({
                    ...t,
                    albumId: albumIdsByExternalId[t.albumId]!,
                    artistId: artistIdsByExternalId[t.artistId]!,
                }),
            ),
        )

        return explorer
    }

    async resolveTrackUrl(trackId: string): Promise<string> {
        return this.resolver.resolveTrackUrl(trackId)
    }

    async getLibrary(): Promise<LibraryContents> {
        return this.library.list()
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
    ): Promise<{ track: CataloguedTrack; album: CataloguedAlbum; artist: CataloguedArtist }> {
        const externalTrack = await this.service.lookupTrack(externalTrackId)
        const [matchingTrack = undefined] = await this.library.matchTracks([externalTrack.externalId])
        if (matchingTrack === undefined) {
            const [album, artist] = await Promise.all([
                this.addAlbumForTrack(externalTrack.albumId),
                this.addArtistForTrack(externalTrack.artistId),
            ])
            const track = await this.library.addTrack({
                ...externalTrack,
                albumId: album.catalogueId,
                artistId: artist.catalogueId,
            })
            return { track, album, artist }
        } else {
            // already in library, just ensure it's marked as saved
            const [track, artist, album] = await Promise.all([
                this.library.save(matchingTrack.catalogueId).then(_ => matchingTrack),
                this.library.getArtist(matchingTrack.artistId),
                this.library.getAlbum(matchingTrack.albumId),
            ])
            return { track, artist, album }
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

    private async addArtistForTrack(externalArtistId: string) {
        const [matchingArtist = undefined] = await this.library.matchArtists([externalArtistId])
        if (matchingArtist === undefined) {
            const externalArtist = await this.service.lookupArtist(externalArtistId)
            return this.library.addArtist(externalArtist)
        } else {
            return matchingArtist
        }
    }

    async importItunesLibrary(itunesLibraryXml: string): Promise<ImportItunesResult> {
        // TODO: some error handling
        const itunesLibraryContents = parseItunesLibraryXml(itunesLibraryXml)
        // hmm, we really shouldn't be seeing duplicates here, maybe that should produce a warning
        const itunesTracksByExternalTrackId = new Map<string, ItunesTrack>()
        // TODO: for now we limit import to 200 tracks
        for (const track of itunesLibraryContents.tracks
            // order by date added, descending
            .sort((t1, t2) => (t2.dateAdded ?? 0) - (t1.dateAdded ?? 0))
            // take first 200 tracks, for the time being
            .slice(0, 200)) {
            const matches = await this.searchForItunesTrack(track)
            if (matches.results.externalTrackIds.length === 0) {
                // TODO: inform the user that we failed to match this track
                continue
            } else {
                const externalTrackId = matches.results.externalTrackIds[0]!
                itunesTracksByExternalTrackId.set(externalTrackId, track)
            }
        }

        for (const track of await this.library.matchTracks([...itunesTracksByExternalTrackId.keys()])) {
            // TODO: could we update metadata and stuff? rating? added timestamp?
            itunesTracksByExternalTrackId.delete(track.externalId)
        }
        // now externalTrackIds only contains IDs of new tracks to catalogue

        const externalTracks = await Promise.all(
            [...itunesTracksByExternalTrackId.keys()].map(async tid => this.service.lookupTrack(tid)),
        )

        const externalAlbumIds = new Set(externalTracks.map(t => t.albumId))
        const externalArtistIds = new Set(externalTracks.map(t => t.artistId))

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
                    rating: itunesTracksByExternalTrackId.get(t.externalId)!.rating ?? null,
                    albumId: albumIdsByExternalId.get(t.albumId)!,
                    artistId: artistIdsByExternalId.get(t.artistId)!,
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

    private async searchForItunesTrack({ title, albumName, artistName, durationSecs }: ItunesTrack) {
        // this code was inspired by a previous effort, search_dz.py
        const query = {
            title,
            albumName,
            artistName,
            ...(durationSecs !== undefined && {
                minDurationSecs: Math.floor(durationSecs - 10),
                maxDurationSecs: Math.ceil(durationSecs + 10),
            }),
        }
        const matches = await this.service.searchTracks(query)
        if (matches.results.externalTrackIds.length > 0) {
            return matches
        }

        // if no match, try removing stuff in brackets in the song or album title
        const query2 = {
            ...query,
            title: removeStuffInBrackets(query.title),
            albumName: removeStuffInBrackets(query.albumName),
        }
        return this.service.searchTracks(query2)
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

function removeStuffInBrackets(s: string): string {
    return s.replace(/\[.*?]|\(.*?\)/g, "")
}
