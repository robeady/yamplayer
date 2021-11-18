import { CatalogueIdString } from "../backend/database/catalogueIds"
import { Dict, Fraction, Int, OPAQUE, Timestamp } from "../util/types"

export type TrackId = number & { readonly [OPAQUE]: unique symbol }
export type ArtistId = number & { readonly [OPAQUE]: unique symbol }
export type AlbumId = number & { readonly [OPAQUE]: unique symbol }

// A track can be in various states:
// - it can be external only, e.g. when returned in search results
// - it can be in saved in the catalogue
// - it can be in the catalogue but not saved, because the user subsequently unsaved it

export interface CataloguedTrack extends Track {
    catalogueId: CatalogueIdString
    cataloguedTimestamp: Timestamp
    /** When the track was (last) marked saved, or null if the track is not saved */
    savedTimestamp: Timestamp | null
}

export interface Track extends ExternalTrack {
    catalogueId: CatalogueIdString | null
    cataloguedTimestamp: Timestamp | null
    /** When the track was (last) marked saved, or null if the track is not saved */
    savedTimestamp: Timestamp | null
}

export interface ExternalTrack {
    externalId: string
    albumId: string
    artistIds: string[]
    title: string
    trackNumber: Int | null
    discNumber: Int | null
    isrc: string | null
    durationSecs: number
    rating: Fraction | null
}

export interface CataloguedAlbum extends Album {
    catalogueId: CatalogueIdString
    cataloguedTimestamp: Timestamp
}

export interface Album extends ExternalAlbum {
    catalogueId: CatalogueIdString | null
    cataloguedTimestamp: Timestamp | null
}

export interface ExternalAlbum {
    externalId: string
    artistId: string
    title: string
    coverImageUrl: string | null
    releaseDate: string | null
    numTracks: Int | null
}

export interface CataloguedArtist extends Artist {
    catalogueId: CatalogueIdString
    cataloguedTimestamp: Timestamp
}

export interface Artist extends ExternalArtist {
    catalogueId: CatalogueIdString | null
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

export interface Playlist {
    catalogueId: CatalogueIdString
    name: string
}
