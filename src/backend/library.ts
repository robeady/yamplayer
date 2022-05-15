import { groupBy, isEmpty, keyBy, map } from "lodash"
import {
    CataloguedAlbum,
    CataloguedArtist,
    CataloguedTrack,
    ExternalAlbum,
    ExternalArtist,
    ExternalTrack,
    Playlist,
} from "../model"
import { parseExternalId, splitExternalId } from "../services/ids"
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
import { moduleLogger } from "./logging"

const logger = moduleLogger(module)

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
        const { track, trackArtist, artist, album, trackReference, albumReference, artistReference } = tables
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

        // I kept this out of the join for now, not sure really how best to do this giant query
        const [trackRefsRows, albumRefsRows, artistRefsRows] = await Promise.all([
            this.query(trackReference).fetch(),
            this.query(albumReference).fetch(),
            this.query(artistReference).fetch(),
        ])
        const trackRefs = groupBy(trackRefsRows, r => stringifyCatalogueId(r.trackId))
        const albumRefs = groupBy(albumRefsRows, r => stringifyCatalogueId(r.albumId))
        const artistRefs = groupBy(artistRefsRows, r => stringifyCatalogueId(r.artistId))

        const tracks = {} as Dict<CataloguedTrack>
        const artists = {} as Dict<CataloguedArtist>
        const albums = {} as Dict<CataloguedAlbum>

        for (const row of rows) {
            // _Slow_ we do some unnecessary mapping here for tracks/artists/albums already encountered
            // we could do less work by mapping the IDs first and checking if they've been seen already
            const mappedTrack = mapTrackExceptArtistIds(row.track, trackRefs)
            let existingTrack = tracks[mappedTrack.id]
            if (existingTrack === undefined) {
                existingTrack = mappedTrack
                tracks[mappedTrack.id] = mappedTrack
            }
            // _Slow_ we might have seen the album/artist before too but oh well
            const mappedAlbum = mapAlbum(row.album, albumRefs)
            albums[mappedAlbum.id] = mappedAlbum
            const mappedArtist = mapArtist(row.artist, artistRefs)
            artists[mappedArtist.id] = mappedArtist
            existingTrack.artistIds.push(mappedArtist.id)
        }

        // it would be unusual but maybe there are some extra artists that don't appear in any of the tracks
        const unretrievedAlbumArtists = map(albums, a => a.artistId)
            .filter(artistId => !(artistId in artists))
            .map(parseCatalogueId)
        if (unretrievedAlbumArtists.length > 0) {
            logger.info(`performing extra query for ${unretrievedAlbumArtists.length} album artists`)
            const albumArtistRows = await this.query(artist)
                .where(artist.id, "IN", unretrievedAlbumArtists)
                .fetch()
            for (const r of albumArtistRows) {
                const mapped = mapArtist(r, artistRefs)
                artists[mapped.id] = mapped
            }
        }

        return { tracks, artists, albums }
    }

    async listPlaylists() {
        const playlistRows = await this.query(tables.playlist).fetch()
        const playlists = {} as Dict<Playlist>
        for (const row of playlistRows) {
            const playlist = {
                id: stringifyCatalogueId(row.id),
                name: row.name,
            }
            playlists[playlist.id] = playlist
        }
        return playlists
    }

    async getAlbum(catalogueId: string) {
        const { album, albumReference } = tables
        const rows = await this.query(album)
            .innerJoin(albumReference)
            .on(album.id, "=", albumReference.albumId)
            .where(album.id, "=", parseCatalogueId(catalogueId))
            .fetch()
        return rows.length > 0
            ? mapAlbum(rows[0]!.album, { [catalogueId]: rows.map(r => r.albumReference) })
            : undefined
    }

    async getArtist(catalogueId: string) {
        const { artist, artistReference } = tables
        const rows = await this.query(artist)
            .innerJoin(artistReference)
            .on(artist.id, "=", artistReference.artistId)
            .where(artist.id, "=", parseCatalogueId(catalogueId))
            .fetch()
        return rows.length > 0
            ? mapArtist(rows[0]!.artist, { [catalogueId]: rows.map(r => r.artistReference) })
            : undefined
    }

    /** Returns all of the requested artists that exist, ordered the same as in the request array */
    async getArtists(catalogueIds: string[]) {
        const { artist, artistReference } = tables
        const rows = await this.query(artist)
            .innerJoin(artistReference)
            .on(artist.id, "=", artistReference.artistId)
            .where(artist.id, "IN", catalogueIds.map(parseCatalogueId))
            .fetch()
        const byId: Record<string, CataloguedArtist> = {}
        for (const row of rows) {
            const rowId = stringifyCatalogueId(row.artist.id)
            let artist = byId[rowId]
            if (artist === undefined) {
                artist = mapArtist(row.artist, {})
                byId[rowId] = artist
            }
            artist.externalIds.push(stringifyExternalId(row.artistReference))
        }
        return catalogueIds.map(id => byId[id])
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

        // TODO _transaction_

        const trackInsert = this.query(tables.track)
            .insert({
                id,
                title: trackPointingToInternalArtistAndAlbum.title,
                trackNumber: trackPointingToInternalArtistAndAlbum.trackNumber ?? null,
                discNumber: trackPointingToInternalArtistAndAlbum.discNumber ?? null,
                albumId: parseCatalogueId(trackPointingToInternalArtistAndAlbum.albumId),
                savedTimestamp: now,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc ?? null,
                playCount: 0,
                rating: trackPointingToInternalArtistAndAlbum.rating ?? null,
            })
            .execute()

        const trackRefInsert = this.query(tables.trackReference)
            .insert({ ...externalIdToRow(trackPointingToInternalArtistAndAlbum.id), trackId: id })
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

        await Promise.all([trackInsert, trackRefInsert, artistsInsert])

        return {
            ...trackPointingToInternalArtistAndAlbum,
            id: stringifyCatalogueId(id),
            externalIds: [trackPointingToInternalArtistAndAlbum.id],
            cataloguedTimestamp: now,
            savedTimestamp: now,
        }
    }

    async addAlbum(albumPointingToInternalArtist: ExternalAlbum): Promise<CataloguedAlbum> {
        const now = this.now()
        const id = this.idGenerator.generate()
        // TODO _transaction_
        await Promise.all([
            this.query(tables.album)
                .insert({
                    id,
                    artistId: parseCatalogueId(albumPointingToInternalArtist.artistId),
                    title: albumPointingToInternalArtist.title,
                    coverImageUrl: albumPointingToInternalArtist.coverImageUrl ?? null,
                    releaseDate: albumPointingToInternalArtist.releaseDate ?? null,
                    numTracks: albumPointingToInternalArtist.numTracks ?? null,
                })
                .execute(),
            this.query(tables.albumReference)
                .insert({ ...externalIdToRow(albumPointingToInternalArtist.id), albumId: id })
                .execute(),
        ])

        return {
            ...albumPointingToInternalArtist,
            id: stringifyCatalogueId(id),
            externalIds: [albumPointingToInternalArtist.id],
            cataloguedTimestamp: now,
        }
    }

    async addArtist(externalArtist: ExternalArtist): Promise<CataloguedArtist> {
        const now = this.now()
        const id = this.idGenerator.generate()
        await Promise.all([
            this.query(tables.artist)
                .insert({
                    id,
                    name: externalArtist.name,
                    imageUrl: externalArtist.imageUrl ?? null,
                })
                .execute(),
            this.query(tables.artistReference)
                .insert({ artistId: id, ...externalIdToRow(externalArtist.id) })
                .execute(),
        ])
        return {
            ...externalArtist,
            id: stringifyCatalogueId(id),
            externalIds: [externalArtist.id],
            cataloguedTimestamp: now,
        }
    }

    async matchTracks(externalTrackIds: string[]): Promise<CataloguedTrack[]> {
        if (externalTrackIds.length === 0) return []

        const rows = await this.query(tables.trackReference)
            .innerJoin(tables.trackArtist)
            .on(tables.trackArtist.trackId, "=", tables.trackReference.trackId)
            .innerJoin(tables.track)
            .on(tables.track.id, "=", tables.trackReference.trackId)
            .where(
                [tables.trackReference.externalService, tables.trackReference.externalId],
                "IN",
                externalTrackIds.map(splitExternalId),
            )
            .fetch()

        const tracks = {} as Dict<CataloguedTrack>
        const trackCatalogueIds = []
        for (const row of rows) {
            const mappedTrack = mapTrackExceptArtistIds(row.track, {})
            let existingTrack = tracks[mappedTrack.id]
            if (existingTrack === undefined) {
                existingTrack = mappedTrack
                trackCatalogueIds.push(row.track.id)
                tracks[mappedTrack.id] = mappedTrack
            }
            existingTrack.artistIds.push(stringifyCatalogueId(row.trackArtist.artistId))
        }

        // doing an extra query rather than using aggregate functions for now
        const externalIdRows =
            trackCatalogueIds.length > 0
                ? await this.query(tables.trackReference)
                      .where(tables.trackReference.trackId, "IN", trackCatalogueIds)
                      .fetch()
                : []
        for (const row of externalIdRows) {
            tracks[stringifyCatalogueId(row.trackId)]!.externalIds.push(stringifyExternalId(row))
        }

        return Object.values(tracks)
    }

    /** No order guarantee */
    async matchAlbums(externalAlbumIds: string[]): Promise<CataloguedAlbum[]> {
        if (externalAlbumIds.length === 0) return []

        const albums = keyBy(
            (
                await this.query(tables.albumReference)
                    .innerJoin(tables.album)
                    .on(tables.albumReference.albumId, "=", tables.album.id)
                    .where(
                        [tables.albumReference.externalService, tables.albumReference.externalId],
                        "IN",
                        externalAlbumIds.map(splitExternalId),
                    )
                    .fetch()
            ).map(element => mapAlbum(element.album, {})),
            a => a.id,
        )

        // doing an extra query rather than using aggregate functions for now
        const externalIdRows = isEmpty(albums)
            ? []
            : await this.query(tables.albumReference)
                  .where(
                      tables.albumReference.albumId,
                      "IN",
                      map(albums, a => parseCatalogueId(a.id)),
                  )
                  .fetch()

        for (const row of externalIdRows) {
            albums[stringifyCatalogueId(row.albumId)]!.externalIds.push(stringifyExternalId(row))
        }

        return Object.values(albums)
    }

    async matchArtists(externalArtistIds: string[]): Promise<CataloguedArtist[]> {
        if (externalArtistIds.length === 0) return []

        const artists = keyBy(
            (
                await this.query(tables.artistReference)
                    .innerJoin(tables.artist)
                    .on(tables.artistReference.artistId, "=", tables.artist.id)
                    .where(
                        [tables.artistReference.externalService, tables.artistReference.externalId],
                        "IN",
                        externalArtistIds.map(splitExternalId),
                    )
                    .fetch()
            ).map(element => mapArtist(element.artist, {})),
            a => a.id,
        )

        // doing an extra query rather than using aggregate functions for now
        const externalIdRows = isEmpty(artists)
            ? []
            : await this.query(tables.artistReference)
                  .where(
                      tables.artistReference.artistId,
                      "IN",
                      map(artists, a => parseCatalogueId(a.id)),
                  )
                  .fetch()

        for (const row of externalIdRows) {
            artists[stringifyCatalogueId(row.artistId)]!.externalIds.push(stringifyExternalId(row))
        }

        return Object.values(artists)
    }

    async setRating(trackId: CatalogueIdString, rating: Fraction | undefined): Promise<void> {
        if (rating !== undefined && (rating < 0 || rating > 1)) {
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
        return { ...playlist, id: stringifyCatalogueId(id) }
    }
}

function mapAlbum(
    albumFromDb: RowTypeFrom<typeof tables["album"]>,
    albumRefs: Record<string, ExternalIdRow[]>,
): CataloguedAlbum {
    const id = stringifyCatalogueId(albumFromDb.id)
    return {
        id,
        artistId: stringifyCatalogueId(albumFromDb.artistId),
        externalIds: (albumRefs[id] ?? []).map(stringifyExternalId),
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl ?? undefined,
        releaseDate: albumFromDb.releaseDate ?? undefined,
        cataloguedTimestamp: extractTimestamp(albumFromDb.id),
        numTracks: albumFromDb.numTracks ?? undefined,
    }
}

function mapArtist(
    artistFromDb: RowTypeFrom<typeof tables["artist"]>,
    artistRefs: Record<string, ExternalIdRow[]>,
): CataloguedArtist {
    const id = stringifyCatalogueId(artistFromDb.id)
    return {
        id,
        externalIds: (artistRefs[id] ?? []).map(stringifyExternalId),
        name: artistFromDb.name,
        imageUrl: artistFromDb.imageUrl ?? undefined,
        cataloguedTimestamp: extractTimestamp(artistFromDb.id),
    }
}

function mapTrackExceptArtistIds(
    trackFromDb: RowTypeFrom<typeof tables["track"]>,
    trackRefs: Record<string, ExternalIdRow[]>,
): CataloguedTrack {
    const id = stringifyCatalogueId(trackFromDb.id)
    return {
        id,
        albumId: stringifyCatalogueId(trackFromDb.albumId),
        artistIds: [],
        externalIds: (trackRefs[id] ?? []).map(stringifyExternalId),
        title: trackFromDb.title,
        trackNumber: trackFromDb.trackNumber ?? undefined,
        discNumber: trackFromDb.discNumber ?? undefined,
        durationSecs: trackFromDb.durationSecs,
        isrc: trackFromDb.isrc ?? undefined,
        rating: trackFromDb.rating ?? undefined,
        cataloguedTimestamp: extractTimestamp(trackFromDb.id),
        savedTimestamp: trackFromDb.savedTimestamp as Timestamp,
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

interface ExternalIdRow {
    externalService: string
    externalId: string
}

function stringifyExternalId(row: ExternalIdRow) {
    return `${row.externalService}:${row.externalId}`
}

function externalIdToRow(externalId: string) {
    const { service, entityId } = parseExternalId(externalId)
    return { externalService: service, externalId: entityId }
}
