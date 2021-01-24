import { table } from "./dsl/definitions"
import { binaryUlid, number, string } from "./dsl/types"

export const track = table("track", {
    id: binaryUlid,
    cataloguedTimestamp: number,
    externalId: string,
    albumId: binaryUlid,
    artistId: binaryUlid,
    title: string,
    trackNumber: number.orNull(),
    discNumber: number.orNull(),
    isrc: string.orNull(),
    durationSecs: number,
    listenCount: number,
    rating: number.orNull(),
    savedTimestamp: number.orNull(),
})

export const album = table("album", {
    id: binaryUlid,
    cataloguedTimestamp: number,
    externalId: string,
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
})

export const artist = table("artist", {
    id: binaryUlid,
    externalId: string,
    name: string,
    imageUrl: string.orNull(),
    cataloguedTimestamp: number,
})

export const playlist = table("playlist", {
    id: binaryUlid,
    name: string,
})

export const playlistEntry = table("playlistEntry", {
    playlistId: binaryUlid,
    trackId: binaryUlid,
})
