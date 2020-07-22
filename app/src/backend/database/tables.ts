import { table } from "./dsl/definitions"
import { string, number } from "./dsl/types"

export const track = table("track", {
    trackId: number.withDefault(),
    albumId: number,
    artistId: number,
    title: string,
    isrc: string.orNull(),
    durationSecs: number,
    externalId: string,
})

export const album = table("album", {
    albumId: number.withDefault(),
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
    externalId: string,
})

export const artist = table("artist", {
    artistId: number.withDefault(),
    name: string,
    imageUrl: string.orNull(),
    externalId: string,
})

export const playlist = table("playlist", {
    playlistId: number,
    name: string,
})

export const playlistEntry = table("playlistEntry", {
    playlistEntryId: number,
    playlistId: number,
    trackId: number,
})
