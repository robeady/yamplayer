import { LibraryStore } from "./library"
import { Dict } from "../util/types"
import { Album, AddedTrack, Artist, MatchedSearchResults, Track, AddedAlbum, AddedArtist } from "../model"
import { forEach } from "lodash"
import { TrackResolver, Service } from "../services"

export interface LibraryContents {
    tracks: Dict<AddedTrack>
    albums: Dict<AddedAlbum>
    artists: Dict<AddedArtist>
}

export class Explorer {
    constructor(private library: LibraryStore, private service: Service, private resolver: TrackResolver) {}

    static async seeded(
        library: LibraryStore,
        service: Service,
        resolver: TrackResolver,
        externalTrackIds: string[],
    ): Promise<Explorer> {
        library.clear()

        const explorer = new Explorer(library, service, resolver)

        const externalTracks = await Promise.all(externalTrackIds.map(tid => explorer.service.lookupTrack(tid)))
        const externalAlbumIds = new Set(externalTracks.map(t => t.albumId))
        const externalArtistIds = new Set(externalTracks.map(t => t.artistId))
        const externalAlbums = await Promise.all([...externalAlbumIds].map(aid => explorer.service.lookupAlbum(aid)))
        const externalArtists = await Promise.all([...externalArtistIds].map(aid => explorer.service.lookupArtist(aid)))

        const addedArtists = await Promise.all(externalArtists.map(a => explorer.library.addArtist(a)))
        const addedAlbums = await Promise.all(externalAlbums.map(a => explorer.library.addAlbum(a)))
        const artistIdsByExternalId = Object.fromEntries(addedArtists.map(a => [a.externalId, a.libraryId]))
        const albumIdsByExternalId = Object.fromEntries(addedAlbums.map(a => [a.externalId, a.libraryId]))
        await Promise.all(
            externalTracks.map(t =>
                explorer.library.addTrack({
                    ...t,
                    albumId: albumIdsByExternalId[t.albumId],
                    artistId: artistIdsByExternalId[t.artistId],
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
            tracks[id] = { ...track, libraryId: null, saved: false }
        })
        const albums: Dict<Album | string> = {}
        forEach(searchResponse.albums, (album, id) => {
            albums[id] = { ...album, libraryId: null }
        })
        const artists: Dict<Artist | string> = {}
        forEach(searchResponse.artists, (artist, id) => {
            artists[id] = { ...artist, libraryId: null }
        })
        for (const t of matchedTracks) {
            tracks[t.externalId] = t.libraryId
            tracks[t.libraryId] = t
        }
        for (const a of matchedAlbums) {
            albums[a.externalId] = a.libraryId
            albums[a.libraryId] = a
        }
        for (const a of matchedArtists) {
            artists[a.externalId] = a.libraryId
            artists[a.libraryId] = a
        }

        return { results: searchResponse.results, tracks, albums, artists }
    }

    async unsave(trackId: string): Promise<void> {
        return this.library.unsave(trackId)
    }

    async setTrackRating(trackId: string, newRating: number | null): Promise<void> {
        return this.library.setRating(trackId, newRating)
    }

    async addTrack(externalTrackId: string): Promise<{ track: AddedTrack; album: AddedAlbum; artist: AddedArtist }> {
        const externalTrack = await this.service.lookupTrack(externalTrackId)
        const [matchingTrack = undefined] = await this.library.matchTracks([externalTrack.externalId])
        if (matchingTrack !== undefined) {
            // already in library, just ensure it's marked as saved
            const [track, artist, album] = await Promise.all([
                this.library.save(matchingTrack.libraryId).then(_ => matchingTrack),
                this.library.getArtist(matchingTrack.artistId),
                this.library.getAlbum(matchingTrack.albumId),
            ])
            return { track, artist, album }
        } else {
            const [album, artist] = await Promise.all([
                this.addAlbumForTrack(externalTrack.albumId),
                this.addArtistForTrack(externalTrack.artistId),
            ])
            const track = await this.library.addTrack({
                ...externalTrack,
                albumId: album.libraryId,
                artistId: artist.libraryId,
            })
            return { track, album, artist }
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
}
