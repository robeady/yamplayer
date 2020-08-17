import axios, { AxiosInstance } from "axios"
import { SearchResults, ExternalTrack, ExternalArtist, ExternalAlbum } from "../../model"
import { Dict } from "../../util/types"
import { Service } from "../index"
import { setupCache } from "axios-cache-adapter"
import { FilesystemAxiosCache } from "./FilesystemAxiosCache"

type SearchResponse = typeof import("./searchResponse.json")

type MaybeEntityNotFoundResponse = Partial<typeof import("./entityNotFoundResponse.json")>

type TrackResponse = typeof import("./trackResponse.json") & MaybeEntityNotFoundResponse
type AlbumResponse = typeof import("./albumResponse.json") & MaybeEntityNotFoundResponse
type ArtistResponse = typeof import("./artistResponse.json") & MaybeEntityNotFoundResponse

const ONE_YEAR_IN_MILLIS = 1000 * 60 * 60 * 24 * 365

export class DeezerApiClient implements Service {
    private constructor(private apiBaseUrl: string, private axios: AxiosInstance) {}

    static async create({ apiBaseUrl = "https://api.deezer.com", cacheDirectory = null as string | null } = {}) {
        console.log("cache dir " + cacheDirectory)
        return new DeezerApiClient(
            apiBaseUrl,
            axios.create({
                adapter:
                    cacheDirectory === null
                        ? undefined
                        : setupCache({
                              maxAge: ONE_YEAR_IN_MILLIS,
                              store: await FilesystemAxiosCache.open(cacheDirectory),
                          }).adapter,
            }),
        )
    }

    async lookupTrack(id: string): Promise<ExternalTrack> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.axios.get<TrackResponse>(`${this.apiBaseUrl}/track/${rawId}`)
        if (response.data.error) {
            throw Error(`album ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const track = response.data
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
        const response = await this.axios.get<AlbumResponse>(`${this.apiBaseUrl}/album/${rawId}`)
        if (response.data.error) {
            throw Error(`album ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const album = response.data
        return {
            externalId: id,
            title: album.title,
            coverImageUrl: album.cover_medium,
            releaseDate: album.release_date,
        }
    }

    async lookupArtist(id: string): Promise<ExternalArtist> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.axios.get<ArtistResponse>(`${this.apiBaseUrl}/artist/${rawId}`)
        if (response.data.error) {
            throw Error(`artist ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const artist = response.data
        return {
            externalId: id,
            name: artist.name,
            imageUrl: artist.picture_medium,
        }
    }

    async searchTracks(query: string): Promise<SearchResults> {
        const response = await this.axios.get<SearchResponse>(`${this.apiBaseUrl}/search?q=${query}`)
        const payload = response.data

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
