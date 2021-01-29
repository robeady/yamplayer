import { UlidMonotonic } from "id128"
import {
    CataloguedAlbum,
    CataloguedArtist,
    CataloguedTrack,
    ExternalAlbum,
    ExternalArtist,
    ExternalTrack,
} from "../model"
import { unixNow } from "../util/time"
import { Dict, Fraction, Timestamp } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import { RowTypeFrom } from "./database/dsl/stages"
import { MariaDB } from "./database/handle"
import { applyMigrations } from "./database/migrations"
import { yamplayerMigrations } from "./database/schema"
import * as tables from "./database/tables"

export class LibraryStore {
    query: QueryBuilder
    private constructor(database: MariaDB, private now: () => Timestamp = unixNow) {
        this.query = queryBuilder(database)
    }

    static async setup(database: MariaDB, now: () => Timestamp = unixNow): Promise<LibraryStore> {
        await applyMigrations(yamplayerMigrations, database)
        return new LibraryStore(database, now)
    }

    async clear(): Promise<void> {
        await Promise.all(Object.values(tables).map(table => this.query(table).truncate().execute()))
    }

    async list(): Promise<{
        tracks: Dict<CataloguedTrack>
        albums: Dict<CataloguedAlbum>
        artists: Dict<CataloguedArtist>
    }> {
        const { track, artist, album } = tables
        const rows = await this.query(track)
            .innerJoin(album)
            .on(album.id, "=", track.albumId)
            .innerJoin(artist)
            .on(artist.id, "=", track.artistId)
            .where(track.savedTimestamp, "IS NOT", null)
            .fetch()

        const tracks = {} as Dict<CataloguedTrack>
        const artists = {} as Dict<CataloguedArtist>
        const albums = {} as Dict<CataloguedAlbum>
        for (const row of rows) {
            const mappedTrack = mapTrack(row.track)
            const mappedAlbum = mapAlbum(row.album)
            const mappedArtist = mapArtist(row.artist)
            tracks[mappedTrack.catalogueId] = mappedTrack
            albums[mappedAlbum.catalogueId] = mappedAlbum
            artists[mappedArtist.catalogueId] = mappedArtist
        }
        return { tracks, artists, albums }
    }

    async getAlbum(catalogueId: string) {
        return mapAlbum(
            await this.query(tables.album)
                .where({ id: UlidMonotonic.fromCanonical(catalogueId).bytes })
                .fetchOne(),
        )
    }

    async getArtist(catalogueId: string) {
        return mapArtist(
            await this.query(tables.artist)
                .where({ id: UlidMonotonic.fromCanonical(catalogueId).bytes })
                .fetchOne(),
        )
    }

    async save(trackCatalogueId: string) {
        await this.query(tables.track)
            .where({ id: UlidMonotonic.fromCanonical(trackCatalogueId).bytes })
            .update({ savedTimestamp: this.now() })
            .execute()
    }

    async unsave(trackCatalogueId: string) {
        await this.query(tables.track)
            .where({ id: UlidMonotonic.fromCanonical(trackCatalogueId).bytes })
            .update({ savedTimestamp: null })
            .execute()
    }

    async addTrack(trackPointingToInternalArtistAndAlbum: ExternalTrack): Promise<CataloguedTrack> {
        const now = this.now()
        const id = UlidMonotonic.generate()
        const result = await this.query(tables.track)
            .insert({
                id: id.bytes,
                title: trackPointingToInternalArtistAndAlbum.title,
                trackNumber: trackPointingToInternalArtistAndAlbum.trackNumber,
                discNumber: trackPointingToInternalArtistAndAlbum.discNumber,
                externalId: trackPointingToInternalArtistAndAlbum.externalId,
                albumId: UlidMonotonic.fromCanonical(trackPointingToInternalArtistAndAlbum.albumId).bytes,
                artistId: UlidMonotonic.fromCanonical(trackPointingToInternalArtistAndAlbum.artistId).bytes,
                savedTimestamp: now,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc,
                playCount: 0,
                rating: trackPointingToInternalArtistAndAlbum.rating,
                cataloguedTimestamp: now,
            })
            .execute()
        return {
            ...trackPointingToInternalArtistAndAlbum,
            catalogueId: id.toCanonical(),
            cataloguedTimestamp: now,
            savedTimestamp: now,
            rating: null,
        }
    }

    async addAlbum(externalAlbum: ExternalAlbum): Promise<CataloguedAlbum> {
        const now = this.now()
        const id = UlidMonotonic.generate()
        await this.query(tables.album)
            .insert({
                id: id.bytes,
                title: externalAlbum.title,
                coverImageUrl: externalAlbum.coverImageUrl,
                releaseDate: externalAlbum.releaseDate,
                externalId: externalAlbum.externalId,
                cataloguedTimestamp: now,
            })
            .execute()

        return { ...externalAlbum, catalogueId: id.toCanonical(), cataloguedTimestamp: now }
    }

    async addArtist(externalArtist: ExternalArtist): Promise<CataloguedArtist> {
        const now = this.now()
        const id = UlidMonotonic.generate()
        await this.query(tables.artist)
            .insert({
                id: id.bytes,
                name: externalArtist.name,
                imageUrl: externalArtist.imageUrl,
                externalId: externalArtist.externalId,
                cataloguedTimestamp: now,
            })
            .execute()
        return { ...externalArtist, catalogueId: id.toCanonical(), cataloguedTimestamp: now }
    }

    async matchTracks(externalTrackIds: string[]) {
        return externalTrackIds.length === 0
            ? []
            : (
                  await this.query(tables.track)
                      .where(tables.track.externalId, "IN", externalTrackIds)
                      .fetch()
              ).map(mapTrack)
    }

    async matchAlbums(externalAlbumIds: string[]) {
        return externalAlbumIds.length === 0
            ? []
            : (
                  await this.query(tables.album)
                      .where(tables.album.externalId, "IN", externalAlbumIds)
                      .fetch()
              ).map(mapAlbum)
    }

    async matchArtists(externalArtistIds: string[]) {
        return externalArtistIds.length === 0
            ? []
            : (
                  await this.query(tables.artist)
                      .where(tables.artist.externalId, "IN", externalArtistIds)
                      .fetch()
              ).map(mapArtist)
    }

    async setRating(trackId: string, rating: Fraction | null): Promise<void> {
        if (rating !== null && (rating < 0 || rating > 1)) {
            throw Error(`tried to give track ${trackId} invalid rating ${rating}`)
        }
        await this.query(tables.track)
            .where({ id: UlidMonotonic.fromCanonical(trackId).bytes })
            .update({ rating })
            .execute()
        // TODO: verify that the track existed (affected rows may still be 0 if the rating didn't change)
    }
}

function mapAlbum(albumFromDb: RowTypeFrom<typeof tables["album"]>): CataloguedAlbum {
    return {
        catalogueId: UlidMonotonic.construct(albumFromDb.id).toCanonical(),
        externalId: albumFromDb.externalId,
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl,
        releaseDate: albumFromDb.releaseDate,
        cataloguedTimestamp: albumFromDb.cataloguedTimestamp as Timestamp,
    }
}

function mapArtist(artistFromDb: RowTypeFrom<typeof tables["artist"]>): CataloguedArtist {
    return {
        catalogueId: UlidMonotonic.construct(artistFromDb.id).toCanonical(),
        externalId: artistFromDb.externalId,
        name: artistFromDb.name,
        imageUrl: artistFromDb.imageUrl,
        cataloguedTimestamp: artistFromDb.cataloguedTimestamp as Timestamp,
    }
}

function mapTrack(trackFromDb: RowTypeFrom<typeof tables["track"]>): CataloguedTrack {
    return {
        catalogueId: UlidMonotonic.construct(trackFromDb.id).toCanonical(),
        albumId: UlidMonotonic.construct(trackFromDb.albumId).toCanonical(),
        artistId: UlidMonotonic.construct(trackFromDb.artistId).toCanonical(),
        externalId: trackFromDb.externalId,
        title: trackFromDb.title,
        trackNumber: trackFromDb.trackNumber,
        discNumber: trackFromDb.discNumber,
        durationSecs: trackFromDb.durationSecs,
        isrc: trackFromDb.isrc,
        rating: trackFromDb.rating,
        cataloguedTimestamp: trackFromDb.cataloguedTimestamp as Timestamp,
        savedTimestamp: trackFromDb.savedTimestamp as Timestamp,
    }
}
