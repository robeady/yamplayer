import { table } from "./dsl/definitions"
import { binary, number, string } from "./dsl/types"

export const track = table("track", {
    id: binary,
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

export const trackReference = table("trackReference", {
    trackId: binary,
    externalService: string,
    externalId: string,
})

export const trackArtist = table("trackArtist", {
    trackId: binary,
    artistId: binary,
    priority: number,
})

export const album = table("album", {
    id: binary,
    artistId: binary,
    title: string,
    coverImageUrl: string.orNull(),
    releaseDate: string.orNull(),
    numTracks: number.orNull(),
})

export const albumReference = table("albumReference", {
    albumId: binary,
    externalService: string,
    externalId: string,
})

export const artist = table("artist", {
    id: binary,
    name: string,
    imageUrl: string.orNull(),
})

export const artistReference = table("artistReference", {
    artistId: binary,
    externalService: string,
    externalId: string,
})

export const playlist = table("playlist", {
    id: binary,
    name: string,
})

export const playlistEntry = table("playlistEntry", {
    playlistId: binary,
    trackId: binary,
})
