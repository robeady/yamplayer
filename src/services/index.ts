import { ExternalAlbum, ExternalArtist, ExternalTrack, SearchResults } from "../model"
import { Decoder } from "./plugins/decoder"

export interface TrackSearchQuery {
    title?: string
    albumName?: string
    artistName?: string
    minDurationSecs?: number
    maxDurationSecs?: number
}

export interface Service {
    lookupTrack: (externalId: string) => Promise<ExternalTrack>
    lookupAlbum: (externalId: string) => Promise<ExternalAlbum>
    lookupAlbumAndTracks: (
        externalId: string,
    ) => Promise<{ album: ExternalAlbum; tracks: ExternalTrack[]; artist: ExternalArtist }>
    lookupArtist: (externalId: string) => Promise<ExternalArtist>
    searchTracks: (query: string | TrackSearchQuery) => Promise<SearchResults>
}

export interface TrackResolver {
    resolveTrackUrl: (externalId: string) => Promise<string>
}

export interface TrackDecoder {
    decodeTrackInPlace: (externalId: string, data: Uint8Array) => void
}

export const defaultDecoder: TrackDecoder = new Decoder()
