import { Dict, Timestamp, Fraction, Int } from "../util/types"

declare const NEWTYPE: unique symbol

export type TrackId = number & { readonly [NEWTYPE]: unique symbol }
export type ArtistId = number & { readonly [NEWTYPE]: unique symbol }
export type AlbumId = number & { readonly [NEWTYPE]: unique symbol }

// A track can be in various states:
// - it can be external only, e.g. when returned in search results
// - it can be in saved in the catalogue
// - it can be in the catalogue but not saved, because the user subsequently unsaved it

export interface CataloguedTrack extends Track {
    catalogueId: string
    cataloguedTimestamp: Timestamp
    /** When the track was (last) marked saved, or null if the track is not saved */
    savedTimestamp: Timestamp | null
}

export interface Track extends ExternalTrack {
    catalogueId: string | null
    cataloguedTimestamp: Timestamp | null
    /** When the track was (last) marked saved, or null if the track is not saved */
    savedTimestamp: Timestamp | null
}

export interface ExternalTrack {
    externalId: string
    albumId: string
    artistId: string
    title: string
    trackNumber: Int | null
    discNumber: Int | null
    isrc: string | null
    durationSecs: number
    rating: Fraction | null
}

export interface CataloguedAlbum extends Album {
    catalogueId: string
    cataloguedTimestamp: Timestamp
}

export interface Album extends ExternalAlbum {
    catalogueId: string | null
    cataloguedTimestamp: Timestamp | null
}

export interface ExternalAlbum {
    externalId: string
    title: string
    coverImageUrl: string | null
    releaseDate: string | null
}

export interface CataloguedArtist extends Artist {
    catalogueId: string
    cataloguedTimestamp: Timestamp
}

export interface Artist extends ExternalArtist {
    catalogueId: string | null
    cataloguedTimestamp: Timestamp | null
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
