import { table } from "./dsl/definitions"
import { string, number } from "./dsl/types"

export const track = table("track", {
    trackId: number.withDefault(),
    externalId: string,
    albumId: number,
    artistId: number,
    title: string,
    trackNumber: number.orNull(),
    discNumber: number.orNull(),
    isrc: string.orNull(),
    durationSecs: number,
    rating: number.orNull(),
    cataloguedTimestamp: number,
    savedTimestamp: number.orNull(),
})

export const album = table("album", {
    albumId: number.withDefault(),
    externalId: string,
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
    cataloguedTimestamp: number,
})

export const artist = table("artist", {
    artistId: number.withDefault(),
    externalId: string,
    name: string,
    imageUrl: string.orNull(),
    cataloguedTimestamp: number,
})

export const playlist = table("playlist", {
    playlistId: number,
    name: string,
})

export const playlistEntry = table("playlistEntry", {
    playlistEntryId: number.withDefault(),
    playlistId: number,
    trackId: number,
})
