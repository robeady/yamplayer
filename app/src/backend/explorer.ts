import { LibraryStore } from "./library"
import { DeezerApiClient } from "./deezer/gateway"
import { Dict } from "../util/types"
import { Album, Track, Artist, Added, Library, MatchedSearchResults, External } from "../model"
import { forEach } from "lodash"

export interface LibraryContents {
    tracks: Dict<Library<Track>>
    albums: Dict<Library<Album>>
    artists: Dict<Library<Artist>>
}

export class Explorer {
    constructor(private library: LibraryStore, private deezerClient: DeezerApiClient) {}

    async getLibrary(): Promise<LibraryContents> {
        return this.library.list()
    }

    async searchTracks(query: string): Promise<MatchedSearchResults> {
        const searchResponse = await this.deezerClient.searchTracks(query)
        const [matchedTracks, matchedAlbums, matchedArtists] = await Promise.all([
            this.library.matchTracks(Object.keys(searchResponse.tracks)),
            this.library.matchAlbums(Object.keys(searchResponse.albums)),
            this.library.matchArtists(Object.keys(searchResponse.artists)),
        ])

        const tracks: Dict<External<Track> | string> = {}
        forEach(searchResponse.tracks, (track, id) => {
            tracks[id] = { ...track, saved: false }
        })
        const albums: Dict<External<Album> | string> = { ...searchResponse.albums }
        const artists: Dict<External<Artist> | string> = { ...searchResponse.artists }

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

    async addTrack(
        externalTrackId: string,
    ): Promise<{ track: Added<Track>; album: Added<Album>; artist: Added<Artist> }> {
        const externalTrack = await this.deezerClient.getTrack(externalTrackId)
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
            const externalAlbum = await this.deezerClient.getAlbum(externalAlbumId)
            return this.library.addAlbum(externalAlbum)
        } else {
            return matchingAlbum
        }
    }

    private async addArtistForTrack(externalArtistId: string) {
        const [matchingArtist = undefined] = await this.library.matchArtists([externalArtistId])
        if (matchingArtist === undefined) {
            const externalArtist = await this.deezerClient.getArtist(externalArtistId)
            return this.library.addArtist(externalArtist)
        } else {
            return matchingArtist
        }
    }
}

function isIdExternal(id: string) {
    return id.startsWith("dz:")
}
