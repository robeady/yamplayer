import { Dict } from "../util/types"

declare const NEWTYPE: unique symbol

export type TrackId = number & { readonly [NEWTYPE]: unique symbol }
export type ArtistId = number & { readonly [NEWTYPE]: unique symbol }
export type AlbumId = number & { readonly [NEWTYPE]: unique symbol }

export interface AddedTrack extends Track {
    libraryId: string
    saved: boolean
    creationTimestamp: number
}

export interface Track extends ExternalTrack {
    libraryId: string | null
    saved: boolean
}

export interface ExternalTrack {
    externalId: string
    albumId: string
    artistId: string
    title: string
    isrc: string | null
    durationSecs: number
    rating: number | null
}

export interface AddedAlbum extends Album {
    libraryId: string
}

export interface Album extends ExternalAlbum {
    libraryId: string | null
}

export interface ExternalAlbum {
    externalId: string
    title: string
    coverImageUrl: string | null
    releaseDate: string | null
}

export interface AddedArtist extends Artist {
    libraryId: string
}

export interface Artist extends ExternalArtist {
    libraryId: string | null
}

export interface ExternalArtist {
    externalId: string
    name: string
    imageUrl: string | null
}

export interface SearchResultLists {
    externalTrackIds: string[]
    externalAlbumIds: string[]
    externalArtistIds: string[]
}

export interface SearchResults {
    results: SearchResultLists
    tracks: Dict<ExternalTrack>
    albums: Dict<ExternalAlbum>
    artists: Dict<ExternalArtist>
}

export interface MatchedSearchResults {
    results: SearchResultLists
    tracks: Dict<Track | string>
    albums: Dict<Album | string>
    artists: Dict<Artist | string>
}
