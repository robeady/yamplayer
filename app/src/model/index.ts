import { Dict } from "../util/types"

declare const NEWTYPE: unique symbol

export type TrackId = number & { readonly [NEWTYPE]: unique symbol }
export type ArtistId = number & { readonly [NEWTYPE]: unique symbol }
export type AlbumId = number & { readonly [NEWTYPE]: unique symbol }

export interface Track extends TrackWithLinks {
    saved: boolean
}

export interface TrackWithLinks extends TrackInfo {
    albumId: string
    artistId: string
}

export interface TrackInfo {
    title: string
    isrc: string | null
    durationSecs: number
}

export interface Album {
    title: string
    coverImageUrl: string | null
    releaseDate: string | null
}

export interface Artist {
    name: string
    imageUrl: string | null
}

export type Library<T> = T & {
    libraryId: string
    externalId: string | null
}

export type Matched<T> = T & {
    libraryId: string | null
    externalId: string
}

export type External<T> = T & { externalId: string }

export type Added<T> = T & {
    libraryId: string
    externalId: string
}

export interface SearchResultLists {
    externalTrackIds: string[]
    externalAlbumIds: string[]
    externalArtistIds: string[]
}

export interface SearchResults {
    results: SearchResultLists
    tracks: Dict<External<TrackWithLinks>>
    albums: Dict<External<Album>>
    artists: Dict<External<Artist>>
}

export interface MatchedSearchResults {
    results: SearchResultLists
    tracks: Dict<External<Track> | string>
    albums: Dict<External<Album> | string>
    artists: Dict<External<Artist> | string>
}
