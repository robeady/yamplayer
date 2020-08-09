import { table } from "./dsl/definitions"
import { string, number, boolean } from "./dsl/types"

export const track = table("track", {
    trackId: number.withDefault(),
    externalId: string,
    albumId: number,
    artistId: number,
    saved: boolean,
    title: string,
    isrc: string.orNull(),
    durationSecs: number,
    rating: number.orNull(),
    creationTimestamp: number,
    saveTimestamp: number.orNull(),
})

export const album = table("album", {
    albumId: number.withDefault(),
    externalId: string,
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
})

export const artist = table("artist", {
    artistId: number.withDefault(),
    externalId: string,
    name: string,
    imageUrl: string.orNull(),
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
