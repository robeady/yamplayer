import { table } from "./dsl/definitions"
import { binary, number, string } from "./dsl/types"

export const track = table("track", {
    id: binary,
    externalId: string,
    albumId: binary,
    artistId: binary,
    title: string,
    trackNumber: number.orNull(),
    discNumber: number.orNull(),
    isrc: string.orNull(),
    durationSecs: number,
    playCount: number,
    rating: number.orNull(),
    savedTimestamp: number.orNull(),
})

export const album = table("album", {
    id: binary,
    externalId: string,
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
})

export const artist = table("artist", {
    id: binary,
    externalId: string,
    name: string,
    imageUrl: string.orNull(),
})

export const playlist = table("playlist", {
    playlistId: binary,
    name: string,
})

export const playlistEntry = table("playlistEntry", {
    playlistId: binary,
    trackId: binary,
})
