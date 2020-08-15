import globalAxios, { AxiosInstance } from "axios"
import { SearchResults, ExternalTrack, ExternalArtist, ExternalAlbum } from "../../model"
import { Dict } from "../../util/types"
import { Service } from "../index"

type SearchResponse = typeof import("./searchResponse.json")

type TrackResponse = typeof import("./trackResponse.json")
type AlbumResponse = typeof import("./albumResponse.json")
type ArtistResponse = typeof import("./artistResponse.json")
type EntityNotFoundResponse = typeof import("./entityNotFoundResponse.json")

export class DeezerApiClient implements Service {
    constructor(private axios: AxiosInstance = globalAxios, private apiBaseUrl = "https://api.deezer.com") {}

    async lookupTrack(id: string): Promise<ExternalTrack> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.axios.get(`${this.apiBaseUrl}/track/${rawId}`)
        if ((response.data as EntityNotFoundResponse).error) {
            throw Error(`album ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const track = response.data as TrackResponse
        return {
            externalId: id,
            albumId: "dz:" + track.album.id,
            artistId: "dz:" + track.artist.id,
            title: track.title,
            durationSecs: track.duration,
            isrc: track.isrc || null, // never observed this to be absent but this seems a safe approach
            rating: null,
        }
    }

    async lookupAlbum(id: string): Promise<ExternalAlbum> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.axios.get(`${this.apiBaseUrl}/album/${rawId}`)
        if ((response.data as EntityNotFoundResponse).error) {
            throw Error(`album ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const album = response.data as AlbumResponse
        return {
            externalId: id,
            title: album.title,
            coverImageUrl: album.cover_medium,
            releaseDate: album.release_date,
        }
    }

    async lookupArtist(id: string): Promise<ExternalArtist> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.axios.get(`${this.apiBaseUrl}/artist/${rawId}`)
        if ((response.data as EntityNotFoundResponse).error) {
            throw Error(`artist ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const artist = response.data as ArtistResponse
        return {
            externalId: id,
            name: artist.name,
            imageUrl: artist.picture_medium,
        }
    }

    async searchTracks(query: string): Promise<SearchResults> {
        const response = await this.axios.get(`${this.apiBaseUrl}/search?q=${query}`)
        const payload = response.data as SearchResponse

        const resultExternalTrackIds = [] as string[]
        const tracks = {} as Dict<ExternalTrack>
        const artists = {} as Dict<ExternalArtist>
        const albums = {} as Dict<ExternalAlbum>

        for (const item of payload.data) {
            const externalTrackId = "dz:" + item.id
            const externalAlbumId = "dz:" + item.album.id
            const externalArtistId = "dz:" + item.artist.id
            resultExternalTrackIds.push(externalTrackId)
            tracks[externalTrackId] = {
                externalId: externalTrackId,
                albumId: externalAlbumId,
                artistId: externalArtistId,
                durationSecs: item.duration,
                title: item.title,
                isrc: null,
                rating: null,
            }
            albums[externalAlbumId] = {
                externalId: externalAlbumId,
                title: item.album.title,
                coverImageUrl: item.album.cover_medium,
                releaseDate: null,
            }
            artists[externalArtistId] = {
                externalId: externalArtistId,
                name: item.artist.name,
                imageUrl: item.artist.picture_medium,
            }
        }
        return {
            results: { externalTrackIds: resultExternalTrackIds, externalAlbumIds: [], externalArtistIds: [] },
            tracks,
            albums,
            artists,
        }
    }
}

function stripDeezerPrefix(id: string) {
    if (id.startsWith("dz:")) {
        return id.substring(3)
    } else {
        throw Error(id + " is not a deezer ID")
    }
}