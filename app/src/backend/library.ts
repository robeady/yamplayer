import { MariaDB } from "./database"
import { Dict } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import * as tables from "./database/tables"
import { Track, Library, Album, Artist, Added, External, TrackWithLinks } from "../model"
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
        tracks: Dict<Library<Track>>
        albums: Dict<Library<Album>>
        artists: Dict<Library<Artist>>
    }> {
        const { track, artist, album } = tables
        const rows = await this.qb(track)
            .innerJoin(album)
            .on(album.albumId, "=", track.albumId)
            .innerJoin(artist)
            .on(artist.artistId, "=", track.artistId)
            .where({ track: { saved: true } })
            .fetch()

        const tracks = {} as Dict<Library<Track>>
        const artists = {} as Dict<Library<Artist>>
        const albums = {} as Dict<Library<Album>>
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
                .where({ albumId: parseInt(libraryId) })
                .fetchOne(),
        )
    }

    async getArtist(libraryId: string) {
        return mapArtist(
            await this.qb(tables.artist)
                .where({ artistId: parseInt(libraryId) })
                .fetchOne(),
        )
    }

    async save(trackLibraryId: string) {
        await this.qb(tables.track)
            .where({ trackId: parseInt(trackLibraryId) })
            .update({ saved: true })
            .execute()
    }

    async addTrack(trackPointingToInternalArtistAndAlbum: External<TrackWithLinks>): Promise<Added<Track>> {
        const result = await this.qb(tables.track)
            .insert({
                title: trackPointingToInternalArtistAndAlbum.title,
                externalId: trackPointingToInternalArtistAndAlbum.externalId,
                albumId: parseInt(trackPointingToInternalArtistAndAlbum.albumId),
                artistId: parseInt(trackPointingToInternalArtistAndAlbum.artistId),
                saved: true,
                durationSecs: trackPointingToInternalArtistAndAlbum.durationSecs,
                isrc: trackPointingToInternalArtistAndAlbum.isrc,
            })
            .execute()
        const libraryId = result.lastInsertedId.toString()
        return { ...trackPointingToInternalArtistAndAlbum, libraryId, saved: true }
    }

    async addAlbum(externalAlbum: External<Album>): Promise<Added<Album>> {
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

    async addArtist(externalArtist: External<Artist>): Promise<Added<Artist>> {
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
}

function mapAlbum(albumFromDb: RowTypeFrom<typeof tables["album"]>): Added<Album> {
    return {
        libraryId: albumFromDb.albumId.toString(),
        externalId: albumFromDb.externalId,
        title: albumFromDb.title,
        coverImageUrl: albumFromDb.coverImageUrl,
        releaseDate: albumFromDb.releaseDate,
    }
}

function mapArtist(artistFromDb: RowTypeFrom<typeof tables["artist"]>): Added<Artist> {
    return {
        libraryId: artistFromDb.artistId.toString(),
        externalId: artistFromDb.externalId,
        name: artistFromDb.name,
        imageUrl: artistFromDb.imageUrl,
    }
}

function mapTrack(trackFromDb: RowTypeFrom<typeof tables["track"]>): Added<Track> {
    return {
        libraryId: trackFromDb.trackId.toString(),
        albumId: trackFromDb.albumId.toString(),
        artistId: trackFromDb.artistId.toString(),
        externalId: trackFromDb.externalId,
        title: trackFromDb.title,
        durationSecs: trackFromDb.durationSecs,
        isrc: trackFromDb.isrc,
        saved: trackFromDb.saved,
    }
}
