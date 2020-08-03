import { MariaDB } from "./database"
import { Dict } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import * as tables from "./database/tables"
import { AddedTrack, ExternalTrack, AddedAlbum, ExternalAlbum, AddedArtist, ExternalArtist } from "../model"
import { RowTypeFrom } from "./database/dsl/stages"

export class LibraryStore {
    qb: QueryBuilder
    constructor(database: MariaDB) {
        this.qb = queryBuilder(database)
    }

    async clear(): Promise<void> {
        await Promise.all(Object.values(tables).map(t => this.qb(t).truncate().execute()))
    }

    async list(): Promise<{
        tracks: Dict<AddedTrack>
        albums: Dict<AddedAlbum>
        artists: Dict<AddedArtist>
    }> {
        const { track, artist, album } = tables
        const rows = await this.qb(track)
            .innerJoin(album)
            .on(album.albumId, "=", track.albumId)
            .innerJoin(artist)
            .on(artist.artistId, "=", track.artistId)
            .where({ track: { saved: true } })
            .fetch()

        const tracks = {} as Dict<AddedTrack>
        const artists = {} as Dict<AddedArtist>
        const albums = {} as Dict<AddedAlbum>
        for (const row of rows) {
            tracks[row.track.trackId] = mapTrack(row.track)
            albums[row.album.albumId] = mapAlbum(row.album)
            artists[row.artist.artistId] = mapArtist(row.artist)
        }
        return { tracks, artists, albums }
    }

    async getAlbum(libraryId: string) {
        return mapAlbum(
            await this.qb(tables.album)
                .where({ albumId: parseId(libraryId) })
                .fetchOne(),
        )
    }

    async getArtist(libraryId: string) {
        return mapArtist(
            await this.qb(tables.artist)
                .where({ artistId: parseId(libraryId) })
                .fetchOne(),
        )
    }

    async save(trackLibraryId: string) {
        await this.qb(tables.track)
            .where({ trackId: parseId(trackLibraryId) })
            .update({ saved: true })
            .execute()
    }

    async unsave(trackLibraryId: string) {
        await this.qb(tables.track)
            .where({ trackId: parseId(trackLibraryId) })
            .update({ saved: false })
            .execute()
    }

    async addTrack(trackPointingToInternalArtistAndAlbum: ExternalTrack): Promise<AddedTrack> {
        const result = await this.qb(tables.track)
            .insert({
                title: trackPointingToInternalArtistAndAlbum.title,
                externalId: trackPointingToInternalArtistAndAlbum.externalId,
                albumId: parseId(trackPointingToInternalArtistAndAlbum.albumId),
                artistId: parseId(trackPointingToInternalArtistAndAlbum.artistId),
                saved: true,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc,
                rating: trackPointingToInternalArtistAndAlbum.rating,
            })
            .execute()
        const libraryId = result.lastInsertedId.toString()
        return { ...trackPointingToInternalArtistAndAlbum, libraryId, saved: true, rating: null }
    }

    async addAlbum(externalAlbum: ExternalAlbum): Promise<AddedAlbum> {
        const result = await this.qb(tables.album)
            .insert({
                title: externalAlbum.title,
                coverImageUrl: externalAlbum.coverImageUrl,
                releaseDate: externalAlbum.releaseDate,
                externalId: externalAlbum.externalId,
            })
            .execute()
        const libraryId = result.lastInsertedId.toString()
        return { ...externalAlbum, libraryId }
    }

    async addArtist(externalArtist: ExternalArtist): Promise<AddedArtist> {
        const result = await this.qb(tables.artist)
            .insert({
                name: externalArtist.name,
                imageUrl: externalArtist.imageUrl,
                externalId: externalArtist.externalId,
            })
            .execute()
        const libraryId = result.lastInsertedId.toString()
        return { ...externalArtist, libraryId }
    }

    async matchTracks(externalTrackIds: string[]) {
        return externalTrackIds.length === 0
            ? []
            : (await this.qb(tables.track).where(tables.track.externalId, "IN", externalTrackIds).fetch()).map(mapTrack)
    }

    async matchAlbums(externalAlbumIds: string[]) {
        return externalAlbumIds.length === 0
            ? []
            : (await this.qb(tables.album).where(tables.album.externalId, "IN", externalAlbumIds).fetch()).map(mapAlbum)
    }

    async matchArtists(externalArtistIds: string[]) {
        return externalArtistIds.length === 0
            ? []
            : (await this.qb(tables.artist).where(tables.artist.externalId, "IN", externalArtistIds).fetch()).map(
                  mapArtist,
              )
    }

    async setRating(trackId: string, rating: number | null): Promise<void> {
        if (rating !== null && (rating < 0 || rating > 1)) {
            throw Error(`tried to give track ${trackId} invalid rating ${rating}`)
        }
        await this.qb(tables.track)
            .where({ trackId: parseId(trackId) })
            .update({ rating })
            .execute()
        // TODO: verify that the track existed (affected rows may still be 0 if the rating didn't change)
    }
}

function mapAlbum(albumFromDb: RowTypeFrom<typeof tables["album"]>): AddedAlbum {
    return {
        libraryId: albumFromDb.albumId.toString(),
        externalId: albumFromDb.externalId,
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl,
        releaseDate: albumFromDb.releaseDate,
    }
}

function mapArtist(artistFromDb: RowTypeFrom<typeof tables["artist"]>): AddedArtist {
    return {
        libraryId: artistFromDb.artistId.toString(),
        externalId: artistFromDb.externalId,
        name: artistFromDb.name,
        imageUrl: artistFromDb.imageUrl,
    }
}

function mapTrack(trackFromDb: RowTypeFrom<typeof tables["track"]>): AddedTrack {
    return {
        libraryId: trackFromDb.trackId.toString(),
        albumId: trackFromDb.albumId.toString(),
        artistId: trackFromDb.artistId.toString(),
        externalId: trackFromDb.externalId,
        title: trackFromDb.title,
        durationSecs: trackFromDb.durationSecs,
        isrc: trackFromDb.isrc,
        saved: trackFromDb.saved,
        rating: trackFromDb.rating,
    }
}

function parseId(id: string): number {
    const n = parseInt(id, 10)
    if (isNaN(n)) {
        throw Error(`${id} is not a valid library ID`)
    }
    return n
}
