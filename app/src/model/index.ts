import { Dict } from "../util/types"

declare const NEWTYPE: unique symbol

export type TrackId = number & { readonly [NEWTYPE]: unique symbol }
export type ArtistId = number & { readonly [NEWTYPE]: unique symbol }
export type AlbumId = number & { readonly [NEWTYPE]: unique symbol }

export interface Track extends TrackInfo {
    albumId: AlbumId
    artistId: ArtistId
    externalId: string
}

export interface ExternalTrack extends TrackInfo {
    libraryId: TrackId | null
    externalAlbumId: string
    externalArtistId: string
}

export interface TrackInfo {
    title: string
    isrc: string | null
    durationSecs: number
}

export interface Album extends AlbumInfo {
    externalId: string
}

export interface ExternalAlbum extends AlbumInfo {
    libraryId: AlbumId | null
}

export interface AlbumInfo {
    title: string
    coverImageUrl: string | null
    releaseDate: string | null
}

export interface Artist extends ArtistInfo {
    externalId: string
}

export interface ExternalArtist extends ArtistInfo {
    libraryId: ArtistId | null
}

export interface ArtistInfo {
    name: string
    imageUrl: string | null
}

export interface SearchResults {
    results: {
        externalTrackIds: string[]
        externalAlbumIds: string[]
        externalArtistIds: string[]
    }
    tracksByExternalId: Dict<ExternalTrack>
    albumsByExternalId: Dict<ExternalAlbum>
    artistsByExternalId: Dict<ExternalArtist>
}
