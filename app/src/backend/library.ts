import { Database } from "./database"
import { AssocArray } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import * as tables from "./database/tables"
import { AlbumId, ArtistId, TrackId, Track, Album, Artist, SearchResults } from "../model"
import { TrackSearchResult } from "./deezer/gateway"
import { pick } from "lodash"
import produce from "immer"

export class Library {
    qb: QueryBuilder
    constructor(database: Database) {
        this.qb = queryBuilder(database)
    }

    async list(): Promise<{ tracks: AssocArray<Track>; albums: AssocArray<Album>; artists: AssocArray<Artist> }> {
        const { track, artist, album } = tables
        const rows = await this.qb(track)
            .innerJoin(album)
            .on(album.albumId, "=", track.albumId)
            .innerJoin(artist)
            .on(artist.artistId, "=", track.artistId)
            .fetch()

        const tracks = {} as AssocArray<Track>
        const artists = {} as AssocArray<Artist>
        const albums = {} as AssocArray<Album>
        for (const row of rows) {
            const trackId = row.track.trackId as TrackId
            delete row.track.trackId
            tracks[trackId] = {
                ...row.track,
                albumId: row.track.albumId as AlbumId,
                artistId: row.track.artistId as ArtistId,
            }

            const albumId = row.album.albumId
            delete row.album.albumId
            albums[albumId] = row.album

            const artistId = row.artist.artistId
            delete row.artist.artistId
            artists[artistId] = row.artist
        }
        return { tracks, artists, albums }
    }

    async match(searchResults: SearchResults): Promise<SearchResults> {
        const { track, album, artist } = tables
        return produce(searchResults, async resultsDraft => {
            await Promise.all([
                this.qb(track)
                    .where(track.externalId, "IN", Object.keys(searchResults.tracksByExternalId))
                    .select(pick(track, "trackId", "externalId"))
                    .fetch()
                    .then(tracks =>
                        tracks.forEach(
                            t => (resultsDraft.tracksByExternalId[t.externalId]!.libraryId = t.trackId as TrackId),
                        ),
                    ),
                this.qb(album)
                    .where(album.externalId, "IN", Object.keys(searchResults.albumsByExternalId))
                    .select(pick(album, "albumId", "externalId"))
                    .fetch()
                    .then(albums =>
                        albums.forEach(
                            a => (resultsDraft.albumsByExternalId[a.externalId]!.libraryId = a.albumId as AlbumId),
                        ),
                    ),
                this.qb(artist)
                    .where(artist.externalId, "IN", Object.keys(searchResults.artistsByExternalId))
                    .select(pick(artist, "artistId", "externalId"))
                    .fetch()
                    .then(artists =>
                        artists.forEach(
                            a => (resultsDraft.artistsByExternalId[a.externalId]!.libraryId = a.artistId as ArtistId),
                        ),
                    ),
            ])
        })
    }

    async addSearchResult(searchResult: TrackSearchResult): Promise<[TrackId, AlbumId, ArtistId]> {
        const artistId =
            searchResult.artist.libraryId ??
            (await this.qb(tables.artist).insert(pick(searchResult.artist, "name", "externalId", "imageUrl")).execute())
                .lastInsertedId

        const albumId =
            searchResult.album.libraryId ??
            (
                await this.qb(tables.album)
                    .insert(pick(searchResult.album, "title", "coverImageUrl", "releaseDate", "externalId"))
                    .execute()
            ).lastInsertedId

        const trackId = (
            await this.qb(tables.track)
                .insert({
                    ...pick(searchResult.track, "title", "durationSecs", "externalId"),
                    isrc: null,
                    albumId,
                    artistId,
                })
                .execute()
        ).lastInsertedId

        console.log(`added track ${searchResult.track.externalId} to library as ${trackId}`)

        return [trackId as TrackId, albumId as AlbumId, artistId as ArtistId]
    }
}
