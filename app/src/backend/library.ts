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
import {
    CatalogueIdGenerator,
    CatalogueIdString,
    extractTimestamp,
    parseCatalogueId,
    stringifyCatalogueId,
} from "./database/catalogueIds"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import { RowTypeFrom } from "./database/dsl/stages"
import { MariaDB } from "./database/handle"
import { applyMigrations } from "./database/migrations"
import { yamplayerMigrations } from "./database/schema"
import * as tables from "./database/tables"

export class LibraryStore {
    query: QueryBuilder
    private constructor(
        database: MariaDB,
        private now: () => Timestamp = now,
        // TODO: should we have one ID generator per entity?
        private idGenerator: CatalogueIdGenerator,
    ) {
        this.query = queryBuilder(database)
    }

    static async setup(database: MariaDB, now: () => Timestamp = unixNow): Promise<LibraryStore> {
        await applyMigrations(yamplayerMigrations, database)
        return new LibraryStore(database, now, new CatalogueIdGenerator(now))
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
                .where({ id: parseCatalogueId(catalogueId) })
                .fetchOne(),
        )
    }

    async getArtist(catalogueId: string) {
        return mapArtist(
            await this.query(tables.artist)
                .where({ id: parseCatalogueId(catalogueId) })
                .fetchOne(),
        )
    }

    async save(trackCatalogueId: string) {
        await this.query(tables.track)
            .where({ id: parseCatalogueId(trackCatalogueId) })
            .update({ savedTimestamp: this.now() })
            .execute()
    }

    async unsave(trackCatalogueId: string) {
        await this.query(tables.track)
            .where({ id: parseCatalogueId(trackCatalogueId) })
            .update({ savedTimestamp: null })
            .execute()
    }

    async addTrack(trackPointingToInternalArtistAndAlbum: ExternalTrack): Promise<CataloguedTrack> {
        const now = this.now()
        const id = this.idGenerator.generate()
        const result = await this.query(tables.track)
            .insert({
                id,
                title: trackPointingToInternalArtistAndAlbum.title,
                trackNumber: trackPointingToInternalArtistAndAlbum.trackNumber,
                discNumber: trackPointingToInternalArtistAndAlbum.discNumber,
                externalId: trackPointingToInternalArtistAndAlbum.externalId,
                albumId: parseCatalogueId(trackPointingToInternalArtistAndAlbum.albumId),
                artistId: parseCatalogueId(trackPointingToInternalArtistAndAlbum.artistId),
                savedTimestamp: now,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc,
                playCount: 0,
                rating: trackPointingToInternalArtistAndAlbum.rating,
            })
            .execute()
        return {
            ...trackPointingToInternalArtistAndAlbum,
            catalogueId: stringifyCatalogueId(id),
            cataloguedTimestamp: now,
            savedTimestamp: now,
            rating: null,
        }
    }

    async addAlbum(externalAlbum: ExternalAlbum): Promise<CataloguedAlbum> {
        const now = this.now()
        const id = this.idGenerator.generate()
        await this.query(tables.album)
            .insert({
                id,
                title: externalAlbum.title,
                coverImageUrl: externalAlbum.coverImageUrl,
                releaseDate: externalAlbum.releaseDate,
                externalId: externalAlbum.externalId,
            })
            .execute()

        return { ...externalAlbum, catalogueId: stringifyCatalogueId(id), cataloguedTimestamp: now }
    }

    async addArtist(externalArtist: ExternalArtist): Promise<CataloguedArtist> {
        const now = this.now()
        const id = this.idGenerator.generate()
        await this.query(tables.artist)
            .insert({
                id,
                name: externalArtist.name,
                imageUrl: externalArtist.imageUrl,
                externalId: externalArtist.externalId,
            })
            .execute()
        return { ...externalArtist, catalogueId: stringifyCatalogueId(id), cataloguedTimestamp: now }
    }

    async matchTracks(externalTrackIds: string[]): Promise<CataloguedTrack[]> {
        return externalTrackIds.length === 0
            ? []
            : (
                  await this.query(tables.track)
                      .where(tables.track.externalId, "IN", externalTrackIds)
                      .fetch()
              ).map(element => mapTrack(element))
    }

    async matchAlbums(externalAlbumIds: string[]): Promise<CataloguedAlbum[]> {
        return externalAlbumIds.length === 0
            ? []
            : (
                  await this.query(tables.album)
                      .where(tables.album.externalId, "IN", externalAlbumIds)
                      .fetch()
              ).map(element => mapAlbum(element))
    }

    async matchArtists(externalArtistIds: string[]): Promise<CataloguedArtist[]> {
        return externalArtistIds.length === 0
            ? []
            : (
                  await this.query(tables.artist)
                      .where(tables.artist.externalId, "IN", externalArtistIds)
                      .fetch()
              ).map(element => mapArtist(element))
    }

    async setRating(trackId: CatalogueIdString, rating: Fraction | null): Promise<void> {
        if (rating !== null && (rating < 0 || rating > 1)) {
            throw new Error(`tried to give track ${trackId} invalid rating ${rating}`)
        }
        await this.query(tables.track)
            .where({ id: parseCatalogueId(trackId) })
            .update({ rating })
            .execute()
        // TODO: verify that the track existed (affected rows may still be 0 if the rating didn't change)
    }
}

function mapAlbum(albumFromDb: RowTypeFrom<typeof tables["album"]>): CataloguedAlbum {
    return {
        catalogueId: stringifyCatalogueId(albumFromDb.id),
        externalId: albumFromDb.externalId,
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl,
        releaseDate: albumFromDb.releaseDate,
        cataloguedTimestamp: extractTimestamp(albumFromDb.id),
    }
}

function mapArtist(artistFromDb: RowTypeFrom<typeof tables["artist"]>): CataloguedArtist {
    return {
        catalogueId: stringifyCatalogueId(artistFromDb.id),
        externalId: artistFromDb.externalId,
        name: artistFromDb.name,
        imageUrl: artistFromDb.imageUrl,
        cataloguedTimestamp: extractTimestamp(artistFromDb.id),
    }
}

function mapTrack(trackFromDb: RowTypeFrom<typeof tables["track"]>): CataloguedTrack {
    return {
        catalogueId: stringifyCatalogueId(trackFromDb.id),
        albumId: stringifyCatalogueId(trackFromDb.albumId),
        artistId: stringifyCatalogueId(trackFromDb.artistId),
        externalId: trackFromDb.externalId,
        title: trackFromDb.title,
        trackNumber: trackFromDb.trackNumber,
        discNumber: trackFromDb.discNumber,
        durationSecs: trackFromDb.durationSecs,
        isrc: trackFromDb.isrc,
        rating: trackFromDb.rating,
        cataloguedTimestamp: extractTimestamp(trackFromDb.id),
        savedTimestamp: trackFromDb.savedTimestamp as Timestamp,
    }
}
