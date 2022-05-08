import { CatalogueIdString } from "../backend/database/catalogueIds"
import { Dict, Fraction, Int, Timestamp } from "../util/types"

// commented out below is _ModelSimplification_

// export interface Track2 {
//     id: string
//     catalogueId?: string
//     externalIds: string[]
//     cataloguedAt?: Timestamp
//     savedAt?: Timestamp
//     albumId: string
//     artistIds: string[]
//     title: string
//     trackNumber?: Int
//     discNumber?: Int
//     isrc?: string
//     durationSecs: number
//     rating?: Fraction
// }

// export type CatalogedTrack = Require<Track2, "catalogueId" | "cataloguedAt">

// export type ExternalTrack = Omit<Track2, "catalogueId" | "cataloguedAt" | "savedAt">

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
    id: string
    externalIds: string[]
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
    id: string
    externalIds: string[]
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
    id: string
    externalIds: string[]
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
