import { Dict, Fraction, Int, Require, Timestamp } from "../util/types"

// commented out below is _ModelSimplification_

export interface Track {
    id: string
    externalIds?: string[]
    cataloguedTimestamp?: Timestamp
    /** When the track was (last) marked saved, or missing if not saved */
    savedTimestamp?: Timestamp
    albumId: string
    artistIds: string[]
    title: string
    trackNumber?: Int
    discNumber?: Int
    isrc?: string
    durationSecs: number
    rating?: Fraction
}

export type CataloguedTrack = Require<Track, "cataloguedTimestamp" | "externalIds">
export type ExternalTrack = Omit<Track, "cataloguedTimestamp" | "externalIds" | "savedTimestamp">

export interface Album {
    id: string
    externalIds?: string[]
    cataloguedTimestamp?: Timestamp
    artistId: string
    title: string
    coverImageUrl?: string
    releaseDate?: string
    numTracks?: Int
}

export type CataloguedAlbum = Require<Album, "cataloguedTimestamp" | "externalIds">
export type ExternalAlbum = Omit<Album, "cataloguedTimestamp" | "externalIds">

export interface Artist {
    id: string
    externalIds?: string[]
    cataloguedTimestamp?: Timestamp
    name: string
    imageUrl?: string
}

export type CataloguedArtist = Require<Artist, "cataloguedTimestamp" | "externalIds">
export type ExternalArtist = Omit<Artist, "cataloguedTimestamp" | "externalIds">

export interface ArtistEtc {
    artist: Artist
    topTracks: Track[]
    albums: Album[]
}

export interface ExternalArtistEtc {
    artist: ExternalArtist
    topTracks: ExternalTrack[]
    albums: ExternalAlbum[]
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
    id: string
    name: string
}
