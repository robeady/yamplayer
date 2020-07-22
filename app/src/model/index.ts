declare const NEWTYPE: unique symbol

export type TrackId = number & { readonly [NEWTYPE]: unique symbol }
export type ArtistId = number & { readonly [NEWTYPE]: unique symbol }
export type AlbumId = number & { readonly [NEWTYPE]: unique symbol }

export interface Track {
    albumId: AlbumId
    artistId: ArtistId
    title: string
    isrc: string | null
    durationSecs: number
    externalId: string
}

export interface Album {
    title: string
    coverImageUrl: string | null
    releaseDate: string | null
    externalId: string
}

export interface Artist {
    name: string
    imageUrl: string | null
    externalId: string
}
