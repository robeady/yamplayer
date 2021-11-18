import { table } from "./dsl/definitions"
import { binary, number, string } from "./dsl/types"

export const track = table("track", {
    id: binary,
    externalId: string,
    albumId: binary,
    title: string,
    trackNumber: number.orNull(),
    discNumber: number.orNull(),
    isrc: string.orNull(),
    durationSecs: number,
    playCount: number,
    rating: number.orNull(),
    savedTimestamp: number.orNull(),
})

export const trackArtist = table("trackArtist", {
    trackId: binary,
    artistId: binary,
    priority: number,
})

export const album = table("album", {
    id: binary,
    artistId: binary,
    externalId: string,
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
    numTracks: number.orNull(),
})

export const artist = table("artist", {
    id: binary,
    externalId: string,
    name: string,
    imageUrl: string.orNull(),
})

export const playlist = table("playlist", {
    id: binary,
    name: string,
})

export const playlistEntry = table("playlistEntry", {
    playlistId: binary,
    trackId: binary,
})
