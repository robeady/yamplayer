import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import { setupCache } from "axios-cache-adapter"
import Bottleneck from "bottleneck"
import { ExternalAlbum, ExternalArtist, ExternalTrack, SearchResults } from "../../model"
import { Dict } from "../../util/types"
import { Service, TrackSearchQuery } from "../index"
import { FilesystemAxiosCache } from "./FilesystemAxiosCache"

type SearchResponse = typeof import("./searchResponse.json")

type MaybeEntityNotFoundResponse = Partial<typeof import("./entityNotFoundResponse.json")>

type TrackResponse = typeof import("./trackResponse.json") & MaybeEntityNotFoundResponse
type AlbumResponse = typeof import("./albumResponse.json") & MaybeEntityNotFoundResponse
type ArtistResponse = typeof import("./artistResponse.json") & MaybeEntityNotFoundResponse

export class DeezerApiClient implements Service {
    private httpGet: <T>(path: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>

    private constructor(apiBaseUrl: string, axios: AxiosInstance, rateLimit: boolean) {
        const get = <T>(path: string, config?: AxiosRequestConfig) => {
            const url = `${apiBaseUrl}/${path}`
            console.log("sending GET request " + JSON.stringify({ ...config, path }))
            return axios.get<T>(url, config)
        }
        if (rateLimit) {
            const rateLimiter = new Bottleneck({
                reservoir: 9,
                reservoirRefreshAmount: 9,
                reservoirIncreaseMaximum: 9,
                reservoirRefreshInterval: 1000, // 10 requests per second is deezer's limit
                maxConcurrent: 3,
                minTime: 100, // at least 100ms between requests after 3 concurrent requests are launched
            })
            this.httpGet = rateLimiter.wrap(get as any)
        } else {
            this.httpGet = get
        }
    }

    static async create({
        apiBaseUrl = "https://api.deezer.com",
        cacheDirectory = null as string | null,
        rateLimit = true,
    } = {}) {
        console.log("cache dir " + cacheDirectory)
        return new DeezerApiClient(
            apiBaseUrl,
            axios.create({
                adapter:
                    cacheDirectory === null
                        ? undefined
                        : setupCache({
                              maxAge: Number.POSITIVE_INFINITY,
                              store: await FilesystemAxiosCache.open(cacheDirectory),
                              // debug: true,
                              clearOnError: false,
                              exclude: { query: false },
                          }).adapter,
            }),
            rateLimit,
        )
    }

    async lookupTrack(id: string): Promise<ExternalTrack> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.httpGet<TrackResponse>(`track/${rawId}`)
        if (response.data.error) {
            throw Error(`album ${id} not found: ${JSON.stringify(response.data.error)}`)
        }
        const track = response.data
        return {
            externalId: id,
            albumId: "dz:" + track.album.id,
            artistId: "dz:" + track.artist.id,
            title: track.title,
            trackNumber: track.track_position,
            discNumber: track.disk_number,
            durationSecs: track.duration,
            isrc: track.isrc || null, // never observed this to be absent but this seems a safe approach
            rating: null,
        }
    }

    async lookupAlbum(id: string): Promise<ExternalAlbum> {
        const rawId = stripDeezerPrefix(id)
        const response = await this.httpGet<AlbumResponse>(`album/${rawId}`)
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
        const response = await this.httpGet<ArtistResponse>(`artist/${rawId}`)
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

    /**
     * Some information is not returned: track number and disc number, isrc, album release date. use the
     * lookup functions to get this information.
     *
     * TODO: consider adding some fields to SearchResults that specify whether track, artist and album objects
     * are complete or whether they should be looked up individually
     */
    async searchTracks(query: string | TrackSearchQuery): Promise<SearchResults> {
        const response =
            typeof query === "string"
                ? await this.httpGet<SearchResponse>("search", { params: { q: query } })
                : await this.httpGet<SearchResponse>("search", { params: { q: buildSearchQuery(query) } })
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
                trackNumber: null,
                discNumber: null,
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
            results: {
                externalTrackIds: resultExternalTrackIds,
                externalAlbumIds: [],
                externalArtistIds: [],
            },
            tracks,
            albums,
            artists,
        }
    }
}

const deezerSearchQueryNameMap: Record<keyof TrackSearchQuery, string> = {
    title: "track",
    albumName: "album",
    artistName: "artist",
    minDurationSecs: "dur_min",
    maxDurationSecs: "dur_max",
}

function buildSearchQuery(query: TrackSearchQuery): string {
    return Object.entries(query)
        .map(([k, v]) => `${(deezerSearchQueryNameMap as any)[k]}:${JSON.stringify(v)}`)
        .join(" ")
}

function stripDeezerPrefix(id: string) {
    if (id.startsWith("dz:")) {
        return id.substring(3)
    } else {
        throw Error(id + " is not a deezer ID")
    }
}
