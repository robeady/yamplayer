import { table, t } from "./dsl/definitions"

export const track = table("track", {
    trackId: t.number.withDefault(),
    albumId: t.number,
    artistId: t.number,
    title: t.string,
    isrc: t.string.orNull(),
    durationSecs: t.number,
    externalId: t.string,
})

export const album = table("album", {
    albumId: t.number.withDefault(),
    title: t.string,
    coverImageUrl: t.string.orNull(),
    releaseDate: t.string.orNull(),
    externalId: t.string,
})

export const artist = table("artist", {
    artistId: t.number.withDefault(),
    name: t.string,
    imageUrl: t.string.orNull(),
    externalId: t.string,
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
