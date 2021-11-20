import { map } from "lodash"
import {
    CataloguedAlbum,
    CataloguedArtist,
    CataloguedTrack,
    ExternalAlbum,
    ExternalArtist,
    ExternalTrack,
    Playlist,
} from "../model"
import { unixNow } from "../util/time"
import { Dict, Fraction, Timestamp } from "../util/types"
import {
    CatalogueIdGenerator,
    CatalogueIdString,
    CATALOGUE_ID_LENGTH_BYTES,
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
import { LibraryContents } from "./explorer"

export class LibraryStore {
    query: QueryBuilder
    private constructor(
        database: MariaDB,

        // TODO: should we have one ID generator per entity?
        private idGenerator: CatalogueIdGenerator,
        private now: () => Timestamp = now,
    ) {
        this.query = queryBuilder(database)
    }

    static async setup(database: MariaDB, now: () => Timestamp = unixNow): Promise<LibraryStore> {
        await applyMigrations(yamplayerMigrations, database)
        return new LibraryStore(database, new CatalogueIdGenerator(now), now)
    }

    async clear(): Promise<void> {
        await Promise.all(Object.values(tables).map(async table => this.query(table).truncate().execute()))
    }

    async list(filter: { albumId?: string; trackSaved?: boolean } = {}): Promise<LibraryContents> {
        const { track, trackArtist, artist, album } = tables
        let query = this.query(track)
            .innerJoin(album)
            .on(album.id, "=", track.albumId)
            .innerJoin(trackArtist)
            .on(trackArtist.trackId, "=", track.id)
            .innerJoin(artist)
            .on(trackArtist.artistId, "=", artist.id)
            .where({})
        if (filter.albumId !== undefined) {
            query = query.and(album.id, "=", parseCatalogueId(filter.albumId))
        }
        if (filter.trackSaved !== undefined) {
            query = query.and(track.savedTimestamp, filter.trackSaved ? "IS NOT" : "IS", null)
        }
        const rows = await query.fetch()

        const tracks = {} as Dict<CataloguedTrack>
        const artists = {} as Dict<CataloguedArtist>
        const albums = {} as Dict<CataloguedAlbum>

        for (const row of rows) {
            // _Slow_ we do some unnecessary mapping here for tracks/artists/albums already encountered
            // we could do less work by mapping the IDs first and checking if they've been seen already
            const mappedTrack = mapTrackExceptArtistIds(row.track)
            let existingTrack = tracks[mappedTrack.catalogueId]
            if (existingTrack === undefined) {
                existingTrack = mappedTrack
                tracks[mappedTrack.catalogueId] = mappedTrack
            }
            // _Slow_ we might have seen the album/artist before too but oh well
            const mappedAlbum = mapAlbum(row.album)
            albums[mappedAlbum.catalogueId] = mappedAlbum
            const mappedArtist = mapArtist(row.artist)
            artists[mappedArtist.catalogueId] = mappedArtist
            existingTrack.artistIds.push(mappedArtist.catalogueId)
        }

        // it would be unusual but maybe there are some extra artists that don't appear in any of the tracks
        const unretrievedAlbumArtists = map(albums, a => a.artistId)
            .filter(artistId => !(artistId in artists))
            .map(parseCatalogueId)
        if (unretrievedAlbumArtists.length > 0) {
            console.log(`performing extra query for ${unretrievedAlbumArtists.length} album artists`)
            const albumArtistRows = await this.query(artist)
                .where(artist.id, "IN", unretrievedAlbumArtists)
                .fetch()
            for (const r of albumArtistRows) {
                const mapped = mapArtist(r)
                artists[mapped.catalogueId] = mapped
            }
        }

        return { tracks, artists, albums }
    }

    async listPlaylists() {
        const playlistRows = await this.query(tables.playlist).fetch()
        const playlists = {} as Dict<Playlist>
        for (const row of playlistRows) {
            const playlist = {
                catalogueId: stringifyCatalogueId(row.id),
                name: row.name,
            }
            playlists[playlist.catalogueId] = playlist
        }
        return playlists
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

    /** Returns all of the requested artists that exist. No guarantees on the ordering of the result. */
    async getArtists(catalogueIds: string[]) {
        return (
            await this.query(tables.artist)
                .where(
                    tables.artist.id,
                    "IN",
                    catalogueIds.map(c => parseCatalogueId(c)),
                )
                .fetch()
        ).map(a => mapArtist(a))
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

        const trackInsert = this.query(tables.track)
            .insert({
                id,
                title: trackPointingToInternalArtistAndAlbum.title,
                trackNumber: trackPointingToInternalArtistAndAlbum.trackNumber,
                discNumber: trackPointingToInternalArtistAndAlbum.discNumber,
                externalId: trackPointingToInternalArtistAndAlbum.externalId,
                albumId: parseCatalogueId(trackPointingToInternalArtistAndAlbum.albumId),
                savedTimestamp: now,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc,
                playCount: 0,
                rating: trackPointingToInternalArtistAndAlbum.rating,
            })
            .execute()

        const artistsInsert = this.query(tables.trackArtist)
            .insert(
                trackPointingToInternalArtistAndAlbum.artistIds.map((a, i) => ({
                    artistId: parseCatalogueId(a),
                    trackId: id,
                    priority: i,
                })),
            )
            .execute()

        await Promise.all([trackInsert, artistsInsert])

        return {
            ...trackPointingToInternalArtistAndAlbum,
            catalogueId: stringifyCatalogueId(id),
            cataloguedTimestamp: now,
            savedTimestamp: now,
            rating: null,
        }
    }

    async addAlbum(albumPointingToInternalArtist: ExternalAlbum): Promise<CataloguedAlbum> {
        const now = this.now()
        const id = this.idGenerator.generate()
        await this.query(tables.album)
            .insert({
                id,
                artistId: parseCatalogueId(albumPointingToInternalArtist.artistId),
                title: albumPointingToInternalArtist.title,
                coverImageUrl: albumPointingToInternalArtist.coverImageUrl,
                releaseDate: albumPointingToInternalArtist.releaseDate,
                externalId: albumPointingToInternalArtist.externalId,
                numTracks: albumPointingToInternalArtist.numTracks,
            })
            .execute()

        return {
            ...albumPointingToInternalArtist,
            catalogueId: stringifyCatalogueId(id),
            cataloguedTimestamp: now,
        }
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
        if (externalTrackIds.length === 0) return []
        const rows = await this.query(tables.track)
            .innerJoin(tables.trackArtist)
            .on(tables.trackArtist.trackId, "=", tables.track.id)
            .where(tables.track.externalId, "IN", externalTrackIds)
            .fetch()

        const tracks = {} as Dict<CataloguedTrack>
        for (const row of rows) {
            const mappedTrack = mapTrackExceptArtistIds(row.track)
            let existingTrack = tracks[mappedTrack.catalogueId]
            if (existingTrack === undefined) {
                existingTrack = mappedTrack
                tracks[mappedTrack.catalogueId] = mappedTrack
            }
            existingTrack.artistIds.push(stringifyCatalogueId(row.trackArtist.artistId))
        }

        return Object.values(tracks)
    }

    /** No order guarantee */
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

    async addPlaylist(playlist: { name: string }): Promise<Playlist> {
        const id = this.idGenerator.generate()
        await this.query(tables.playlist).insert({ name: playlist.name, id }).execute()
        return { ...playlist, catalogueId: stringifyCatalogueId(id) }
    }
}

function mapAlbum(albumFromDb: RowTypeFrom<typeof tables["album"]>): CataloguedAlbum {
    return {
        catalogueId: stringifyCatalogueId(albumFromDb.id),
        artistId: stringifyCatalogueId(albumFromDb.artistId),
        externalId: albumFromDb.externalId,
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl,
        releaseDate: albumFromDb.releaseDate,
        cataloguedTimestamp: extractTimestamp(albumFromDb.id),
        numTracks: albumFromDb.numTracks,
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

function mapTrackExceptArtistIds(trackFromDb: RowTypeFrom<typeof tables["track"]>): CataloguedTrack {
    return {
        catalogueId: stringifyCatalogueId(trackFromDb.id),
        albumId: stringifyCatalogueId(trackFromDb.albumId),
        artistIds: [],
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

function parseCatalogueIdList(idList: Buffer): string[] {
    let i = 0
    const parts = []
    while (i < idList.length) {
        parts.push(idList.slice(i, (i += CATALOGUE_ID_LENGTH_BYTES)))
    }
    if (i > idList.length) {
        throw new Error(
            `id list ${idList} length is ${idList.length} and not a multiple of ${CATALOGUE_ID_LENGTH_BYTES}`,
        )
    }
    return parts.map(stringifyCatalogueId)
}
