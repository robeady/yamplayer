import { MariaDB } from "./database"
import { Dict } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import * as tables from "./database/tables"
import {
    CataloguedTrack,
    ExternalTrack,
    CataloguedAlbum,
    ExternalAlbum,
    CataloguedArtist,
    ExternalArtist,
} from "../model"
import { RowTypeFrom } from "./database/dsl/stages"

export class LibraryStore {
    qb: QueryBuilder
    constructor(database: MariaDB, private now: () => number = Date.now) {
        this.qb = queryBuilder(database)
    }

    async clear(): Promise<void> {
        await Promise.all(Object.values(tables).map(t => this.qb(t).truncate().execute()))
    }

    async list(): Promise<{
        tracks: Dict<CataloguedTrack>
        albums: Dict<CataloguedAlbum>
        artists: Dict<CataloguedArtist>
    }> {
        const { track, artist, album } = tables
        const rows = await this.qb(track)
            .innerJoin(album)
            .on(album.albumId, "=", track.albumId)
            .innerJoin(artist)
            .on(artist.artistId, "=", track.artistId)
            .where(track.savedTimestamp, "IS NOT", null)
            .fetch()

        const tracks = {} as Dict<CataloguedTrack>
        const artists = {} as Dict<CataloguedArtist>
        const albums = {} as Dict<CataloguedAlbum>
        for (const row of rows) {
            tracks[row.track.trackId] = mapTrack(row.track)
            albums[row.album.albumId] = mapAlbum(row.album)
            artists[row.artist.artistId] = mapArtist(row.artist)
        }
        return { tracks, artists, albums }
    }

    async getAlbum(catalogueId: string) {
        return mapAlbum(
            await this.qb(tables.album)
                .where({ albumId: parseId(catalogueId) })
                .fetchOne(),
        )
    }

    async getArtist(catalogueId: string) {
        return mapArtist(
            await this.qb(tables.artist)
                .where({ artistId: parseId(catalogueId) })
                .fetchOne(),
        )
    }

    async save(trackcatalogueId: string) {
        await this.qb(tables.track)
            .where({ trackId: parseId(trackcatalogueId) })
            .update({ savedTimestamp: this.now() })
            .execute()
    }

    async unsave(trackcatalogueId: string) {
        await this.qb(tables.track)
            .where({ trackId: parseId(trackcatalogueId) })
            .update({ savedTimestamp: null })
            .execute()
    }

    async addTrack(trackPointingToInternalArtistAndAlbum: ExternalTrack): Promise<CataloguedTrack> {
        const now = this.now()
        const result = await this.qb(tables.track)
            .insert({
                title: trackPointingToInternalArtistAndAlbum.title,
                trackNumber: trackPointingToInternalArtistAndAlbum.trackNumber,
                discNumber: trackPointingToInternalArtistAndAlbum.discNumber,
                externalId: trackPointingToInternalArtistAndAlbum.externalId,
                albumId: parseId(trackPointingToInternalArtistAndAlbum.albumId),
                artistId: parseId(trackPointingToInternalArtistAndAlbum.artistId),
                savedTimestamp: now,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc,
                rating: trackPointingToInternalArtistAndAlbum.rating,
                cataloguedTimestamp: now,
            })
            .execute()
        const catalogueId = result.lastInsertedId.toString()
        return {
            ...trackPointingToInternalArtistAndAlbum,
            catalogueId,
            cataloguedTimestamp: now,
            savedTimestamp: now,
            rating: null,
        }
    }

    async addAlbum(externalAlbum: ExternalAlbum): Promise<CataloguedAlbum> {
        const now = this.now()
        const result = await this.qb(tables.album)
            .insert({
                title: externalAlbum.title,
                coverImageUrl: externalAlbum.coverImageUrl,
                releaseDate: externalAlbum.releaseDate,
                externalId: externalAlbum.externalId,
                cataloguedTimestamp: now,
            })
            .execute()
        const catalogueId = result.lastInsertedId.toString()
        return { ...externalAlbum, catalogueId, cataloguedTimestamp: now }
    }

    async addArtist(externalArtist: ExternalArtist): Promise<CataloguedArtist> {
        const now = this.now()
        const result = await this.qb(tables.artist)
            .insert({
                name: externalArtist.name,
                imageUrl: externalArtist.imageUrl,
                externalId: externalArtist.externalId,
                cataloguedTimestamp: now,
            })
            .execute()
        const catalogueId = result.lastInsertedId.toString()
        return { ...externalArtist, catalogueId, cataloguedTimestamp: now }
    }

    async matchTracks(externalTrackIds: string[]) {
        return externalTrackIds.length === 0
            ? []
            : (
                  await this.qb(tables.track).where(tables.track.externalId, "IN", externalTrackIds).fetch()
              ).map(mapTrack)
    }

    async matchAlbums(externalAlbumIds: string[]) {
        return externalAlbumIds.length === 0
            ? []
            : (
                  await this.qb(tables.album).where(tables.album.externalId, "IN", externalAlbumIds).fetch()
              ).map(mapAlbum)
    }

    async matchArtists(externalArtistIds: string[]) {
        return externalArtistIds.length === 0
            ? []
            : (
                  await this.qb(tables.artist)
                      .where(tables.artist.externalId, "IN", externalArtistIds)
                      .fetch()
              ).map(mapArtist)
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

function mapAlbum(albumFromDb: RowTypeFrom<typeof tables["album"]>): CataloguedAlbum {
    return {
        catalogueId: albumFromDb.albumId.toString(),
        externalId: albumFromDb.externalId,
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl,
        releaseDate: albumFromDb.releaseDate,
        cataloguedTimestamp: albumFromDb.cataloguedTimestamp,
    }
}

function mapArtist(artistFromDb: RowTypeFrom<typeof tables["artist"]>): CataloguedArtist {
    return {
        catalogueId: artistFromDb.artistId.toString(),
        externalId: artistFromDb.externalId,
        name: artistFromDb.name,
        imageUrl: artistFromDb.imageUrl,
        cataloguedTimestamp: artistFromDb.cataloguedTimestamp,
    }
}

function mapTrack(trackFromDb: RowTypeFrom<typeof tables["track"]>): CataloguedTrack {
    return {
        catalogueId: trackFromDb.trackId.toString(),
        albumId: trackFromDb.albumId.toString(),
        artistId: trackFromDb.artistId.toString(),
        externalId: trackFromDb.externalId,
        title: trackFromDb.title,
        trackNumber: trackFromDb.trackNumber,
        discNumber: trackFromDb.discNumber,
        durationSecs: trackFromDb.durationSecs,
        isrc: trackFromDb.isrc,
        rating: trackFromDb.rating,
        cataloguedTimestamp: trackFromDb.cataloguedTimestamp,
        savedTimestamp: trackFromDb.savedTimestamp,
    }
}

function parseId(id: string): number {
    const n = parseInt(id, 10)
    if (isNaN(n)) {
        throw Error(`${id} is not a valid library ID`)
    }
    return n
}
