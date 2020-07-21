import { table, t } from "./dsl/definitions"

export const track = table("track", {
    trackId: t.number,
    albumId: t.number,
    artistId: t.number,
    title: t.string,
    isrc: t.string.orNull(),
    durationSecs: t.number,
})

export const album = table("album", {
    albumId: t.number,
    title: t.string,
    coverImageUrl: t.string.orNull(),
    releaseDate: t.string.orNull(),
})

export const artist = table("artist", {
    artistId: t.number,
    name: t.string,
    imageUrl: t.string.orNull(),
})

export const playlist = table("playlist", {
    playlistId: t.number,
    name: t.string,
})

export const playlistEntry = table("playlistEntry", {
    playlistEntryId: t.number,
    playlistId: t.number,
    trackId: t.number,
})

export const externalTrack = table("externalTrack", {
    trackId: t.number,
    serviceId: t.string,
    externalId: t.string,
})

export const externalAlbum = table("externalAlbum", {
    albumId: t.number,
    serviceId: t.string,
    externalId: t.string,
})

export const externalArtist = table("externalArtist", {
    artistId: t.number,
    serviceId: t.string,
    externalId: t.string,
})
